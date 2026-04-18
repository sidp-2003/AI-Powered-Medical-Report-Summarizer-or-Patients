"""
pipeline/models.py
All data classes for the API response.
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class PatientContext:
    age: int
    gender: str               # "M" | "F"
    language: str = "en"
    medications: list[str] = field(default_factory=list)


@dataclass
class TestResult:
    test_name: str
    value: float
    unit: str
    status: str               # normal | low | high | critical_low | critical_high
    severity: str             # normal | mild | moderate | critical
    reference_range: str
    flag_label: str
    explanation: str
    category: str
    deviation_pct: float
    loinc: str = ""


@dataclass
class PatternResult:
    name: str
    confidence: float
    severity: str
    urgency: str
    explanation: str
    symptoms: list[str]
    doctor_questions: list[str]
    matched_tests: list[str]
    icd10: str
    dietary_note: str


@dataclass
class AnalysisReport:
    # Meta
    processing_time_s: float
    extraction_method: str
    ocr_confidence: float
    warnings: list[str]
    # Patient
    patient_age: int
    patient_gender: str
    # Score
    health_score: int
    health_grade: str
    health_color: str
    score_breakdown: dict
    score_summary: str
    # Results
    all_tests: list[TestResult]
    normal_tests: list[TestResult]
    abnormal_tests: list[TestResult]
    # Summary
    health_summary: str
    patterns: list[PatternResult]
    doctor_questions: list[str]
    # Counts
    total_tests: int
    normal_count: int
    mild_count: int
    moderate_count: int
    critical_count: int
    # Optional error
    error: Optional[str] = None

    def to_dict(self) -> dict:
        def _serialize(obj):
            if hasattr(obj, "__dataclass_fields__"):
                return {k: _serialize(v) for k, v in asdict(obj).items()}
            if isinstance(obj, list):
                return [_serialize(i) for i in obj]
            return obj
        return _serialize(self)