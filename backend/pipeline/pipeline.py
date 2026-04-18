"""
pipeline/pipeline.py
Orchestrates the full analysis:
  1. Extract text from PDF/image  (ocr.py)
  2. Send to Claude for analysis  (analyzer.py)
  3. Build typed response          (models.py)
"""

from __future__ import annotations
import re
import time
from typing import Optional
from loguru import logger

from pipeline.models import (
    PatientContext, TestResult, PatternResult, AnalysisReport
)


def _score_color(score: int) -> str:
    if score >= 90: return "#10B981"
    if score >= 75: return "#34D399"
    if score >= 60: return "#F59E0B"
    if score >= 40: return "#F97316"
    return "#EF4444"


def _autodetect_patient(text: str) -> tuple[Optional[int], Optional[str]]:
    """
    Try to pull age and gender out of the report text.
    Returns (age, gender) where gender is "M" or "F", or None if not found.
    """
    age, gender = None, None

    # "Male / 41 Y"  or  "Female / 35 Y"
    m = re.search(r"\b(male|female)\s*/\s*(\d{1,3})\s*[Yy]", text, re.IGNORECASE)
    if m:
        gender = "M" if m.group(1).upper() == "MALE" else "F"
        age = int(m.group(2))
        return age, gender

    # "Sex/Age : Male / 41"
    m = re.search(r"sex[/ ]?age\s*[:/]?\s*(male|female|m|f)\s*/?\s*(\d{1,3})", text, re.IGNORECASE)
    if m:
        g = m.group(1).upper()
        gender = "M" if g in ("M", "MALE") else "F"
        age = int(m.group(2))
        return age, gender

    # Separate age and gender lines
    m = re.search(r"\bage\s*[:/]?\s*(\d{1,3})\b", text, re.IGNORECASE)
    if m:
        age = int(m.group(1))
    m = re.search(r"\b(?:sex|gender)\s*[:/]?\s*(male|female|m|f)\b", text, re.IGNORECASE)
    if m:
        g = m.group(1).upper()
        gender = "M" if g in ("M", "MALE") else "F"

    return age, gender


def _build_test(t: dict) -> Optional[TestResult]:
    try:
        name = str(t.get("test_name") or "").strip()
        if not name:
            return None
        return TestResult(
            test_name=name,
            value=float(t.get("value") or 0),
            unit=str(t.get("unit") or ""),
            status=str(t.get("status") or "normal"),
            severity=str(t.get("severity") or "normal"),
            reference_range=str(t.get("reference_range") or ""),
            flag_label=str(t.get("flag_label") or ""),
            explanation=str(t.get("explanation") or ""),
            category=str(t.get("category") or "Other"),
            deviation_pct=float(t.get("deviation_pct") or 0.0),
            loinc=str(t.get("loinc") or ""),
        )
    except Exception as e:
        logger.warning(f"Skipping test entry {t}: {e}")
        return None


def _build_pattern(p: dict) -> Optional[PatternResult]:
    try:
        return PatternResult(
            name=str(p.get("name") or ""),
            confidence=float(p.get("confidence") or 0.5),
            severity=str(p.get("severity") or "mild"),
            urgency=str(p.get("urgency") or "low"),
            explanation=str(p.get("explanation") or ""),
            symptoms=list(p.get("symptoms") or []),
            doctor_questions=list(p.get("doctor_questions") or []),
            matched_tests=list(p.get("matched_tests") or []),
            icd10=str(p.get("icd10") or ""),
            dietary_note=str(p.get("dietary_note") or ""),
        )
    except Exception as e:
        logger.warning(f"Skipping pattern {p}: {e}")
        return None


class MedicalReportPipeline:

    def __init__(self):
        logger.info("Initializing pipeline...")
        from pipeline.ocr import get_extractor
        from pipeline.analyzer import get_analyzer
        self._extractor = get_extractor()
        self._analyzer = get_analyzer()
        logger.info("Pipeline ready.")

    def analyze(self, file_bytes: bytes, mime_type: str, patient: PatientContext) -> AnalysisReport:
        t0 = time.time()

        # Step 1: Extract text
        extraction = self._extractor.extract_from_bytes(file_bytes, mime_type)
        raw_text = extraction.raw_text
        logger.info(f"Text extracted: {len(raw_text)} chars via {extraction.method_used}")

        # Step 2: Auto-detect patient info if needed
        detected_age, detected_gender = _autodetect_patient(raw_text)
        if detected_age and patient.age in (0, 35):   # 35 = default fallback
            patient = PatientContext(
                age=detected_age,
                gender=detected_gender or patient.gender,
                language=patient.language,
                medications=patient.medications,
            )
            logger.info(f"Auto-detected: age={patient.age}, gender={patient.gender}")

        if not raw_text.strip():
            result = {
                "tests": [], "patterns": [],
                "health_score": 0, "health_grade": "Unknown",
                "score_breakdown": {},
                "health_summary": "Could not extract text from the uploaded file. Please ensure it is a text-based PDF (not a scanned image).",
                "score_summary": "Extraction failed.",
                "doctor_questions": [],
                "error": "No text extracted from file.",
            }
        else:
            # Step 3: Claude analysis
            result = self._analyzer.analyze(
                raw_text, patient.age, patient.gender, patient.medications
            )

        # Step 4: Build typed response
        all_tests = [r for r in (_build_test(t) for t in result.get("tests", [])) if r]
        patterns  = [r for r in (_build_pattern(p) for p in result.get("patterns", [])) if r]

        normal   = [t for t in all_tests if t.status == "normal"]
        abnormal = [t for t in all_tests if t.status != "normal"]

        # Deduplicated doctor questions from top-level + patterns
        dq = list(result.get("doctor_questions") or [])
        for p in patterns:
            for q in p.doctor_questions:
                if q not in dq:
                    dq.append(q)

        score = max(0, min(100, int(result.get("health_score") or 0)))
        elapsed = round(time.time() - t0, 2)

        logger.info(
            f"Done in {elapsed}s | tests={len(all_tests)} | "
            f"abnormal={len(abnormal)} | patterns={len(patterns)} | score={score}"
        )

        return AnalysisReport(
            processing_time_s=elapsed,
            extraction_method=extraction.method_used,
            ocr_confidence=extraction.ocr_confidence,
            warnings=extraction.warnings,
            patient_age=patient.age,
            patient_gender=patient.gender,
            health_score=score,
            health_grade=str(result.get("health_grade") or "Unknown"),
            health_color=_score_color(score),
            score_breakdown=dict(result.get("score_breakdown") or {}),
            score_summary=str(result.get("score_summary") or ""),
            all_tests=all_tests,
            normal_tests=normal,
            abnormal_tests=abnormal,
            health_summary=str(result.get("health_summary") or ""),
            patterns=patterns,
            doctor_questions=dq,
            total_tests=len(all_tests),
            normal_count=len(normal),
            mild_count=sum(1 for t in all_tests if t.severity == "mild"),
            moderate_count=sum(1 for t in all_tests if t.severity == "moderate"),
            critical_count=sum(1 for t in all_tests if t.severity == "critical"),
            error=result.get("error"),
        )


_INSTANCE: Optional[MedicalReportPipeline] = None

def get_pipeline() -> MedicalReportPipeline:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = MedicalReportPipeline()
    return _INSTANCE