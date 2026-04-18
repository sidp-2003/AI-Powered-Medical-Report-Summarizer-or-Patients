from __future__ import annotations
import json
import os
import re
from loguru import logger
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are a Senior Medical Consultant specializing in Clinical Pathology and Patient Communication.
Your task is to transform a raw medical report into a high-literacy, professional "Patient Health Blueprint".
Maintain a professional, authoritative, yet reassuring tone.
Return ONLY a valid JSON object. Do not include markdown formatting like ```json."""

ANALYSIS_PROMPT = """Analyze this lab report for a {age} year old {gender_full} patient.

Optional patient context for personalization:
{patient_context_block}

Output language requirement:

Write ALL user-facing content in {language}.
Keep JSON keys exactly in English as provided in the schema.
Translate values like health_summary, doctors_narrative, explanations, pattern text, doctor questions, dietary notes, activity prescription, and curated resource titles into {language}.

IMPORTANT INSTRUCTIONS:

Use simple, easy-to-understand language.
Avoid unnecessary medical jargon. If used, explain it simply.
Do NOT scare the patient. Keep tone calm and helpful.
Identify likely diseases/conditions based on test patterns (only if reasonably supported).
Do NOT over-diagnose. If unsure, say "possible" or "risk of".
Map detected conditions to relevant Government of India health schemes ONLY if applicable.
Keep explanations practical and actionable.

JSON Structure Requirements:
{{
"health_score": 0,
"health_grade": "Excellent/Good/Fair/Poor",

"health_summary": "Short 1-2 sentence intro summary.",

"doctors_narrative": "A professional causal analysis explaining 'what is what' and 'what leads to what'. MUST be formatted as a cleanly spaced markdown bulleted list using '- ' for each point.",

"detected_conditions": [
{{
"condition_name": "Simple disease name (e.g., High Cholesterol, Diabetes Risk)",
"confidence": 0.0,
"severity": "mild/moderate/severe",
"explanation": "Explain in simple words why this condition is suspected based on test values.",
"preventable": true
}}
],

"tests": [
{{
"test_name": "Name",
"value": "Value",
"unit": "Clean string representation of unit (e.g., mg/dL, 10^9/L, mmol/L)",
"status": "normal/high/low/critical_high/critical_low",
"reference_range": "Normal range (MUST be a medically meaningful range string, never '0.00' or empty unless explicitly present in source report)",
"deviation_pct": 0.0,

  "explanation": "Jargon-checked explanation. Explain complex terms with analogies (e.g., 'Think of eGFR as the speed limit').",

  "category": "Category",
  "severity": "normal/mild/moderate/critical",
  "gauge_position": 0.5
}}

],

"patterns": [
{{
"name": "Clinical Pattern name (e.g., Metabolic Syndrome, Iron Deficiency Anemia)",
"confidence": 0.0,
"urgency": "low/moderate/high",
"severity": "mild/moderate/moderate-severe/severe",

  "explanation": "Describe how these specific test values interact to suggest this pattern.",

  "symptoms": ["Specific symptoms to watch for"],

  "doctor_questions": ["High-quality questions to ask a specialist about this"],

  "dietary_note": "A specific dietary recommendation for this pattern.",

  "icd10": "Related ICD-10 code string",

  "matched_tests": ["List of test names from above that triggered this pattern"]
}}

],

"path_to_normal": {{
"dietary_swaps": ["Direct replacements (e.g., 'Replace fried food with home-cooked meals')"],

"activity_prescription": "Specific exercise type recommendations based on findings."

}},

"curated_resources": {{
"youtube": [
{{"title": "Helpful video title", "url": "YouTube search link"}}
],
"articles": [
{{"title": "Trusted medical article title", "url": "Actual or relevant link"}}
]
}},

"recommended_specialists": [
{{
"specialty": "Specialist Type (e.g., Cardiologist, Endocrinologist)",
"emoji": "🩺",
"reason": "Clear explanation of why this specialist is needed",
"maps_query": "Specialist Type near me"
}}
],

"government_support": [
{{
"scheme_name": "Government scheme name (e.g., Ayushman Bharat PM-JAY)",

  "description": "Explain in simple words what this scheme provides",

  "eligibility": "Who can apply (simple explanation)",

  "benefits": "What benefits patient gets (free treatment, insurance, etc.)",

  "recommended_for": "mild/moderate/severe",

  "how_to_apply": "Simple steps to apply",

  "link": "Official website or search link"
}}

]
}}

REPORT: {report_text}"""

REFERENCE_RANGE_BACKFILL_PROMPT = """You are a clinical lab standards assistant.

Given patient profile and extracted tests, fill medically appropriate reference ranges.

Rules:
- Return ONLY valid JSON object in this shape:
  {"tests": [{"test_name": "...", "reference_range": "..."}]}
- Keep test_name exactly as input.
- reference_range must be a clear string with units when possible.
- Do not return empty, '-', 'N/A', or '0.00' unless source explicitly indicates that exact reference.
- If exact source range is unavailable, provide standard adult clinical reference range appropriate for age/gender context.

Patient:
- Age: {age}
- Sex: {gender_full}

Tests needing reference ranges:
{tests_json}
"""

TRANSLATION_PROMPT = """Translate this medical analysis JSON to {language}.

Rules:
- Preserve JSON keys exactly as-is.
- Keep URLs, numbers, units, and structured enums unchanged where possible (status/severity/urgency).
- Translate all user-facing narrative text values to {language}.
- Return ONLY valid JSON.

JSON:
{json_payload}
"""

_LANGUAGE_MAP = {
  "en": "English",
  "english": "English",
  "hi": "Hindi",
  "hindi": "Hindi",
  "mr": "Marathi",
  "marathi": "Marathi",
  "ta": "Tamil",
  "tamil": "Tamil",
  "te": "Telugu",
  "telugu": "Telugu",
  "bn": "Bengali",
  "bengali": "Bengali",
}

_NON_ENGLISH_LANGUAGES = {"Hindi", "Marathi", "Tamil", "Telugu", "Bengali"}

class MedicalAnalyzer:
  def __init__(self):
    self.api_key = os.environ.get("GEMINI_API_KEY", "")
    self.client = genai.Client(api_key=self.api_key) if self.api_key else None
    self.model = os.environ.get("GEMINI_ANALYZER_MODEL", "").strip()
    if not self.model:
      raise RuntimeError("GEMINI_ANALYZER_MODEL is not set in environment")
    self.max_report_chars = int(os.environ.get("ANALYZER_MAX_REPORT_CHARS", "20000"))
    if self.client:
      logger.info("Gemini 3 Medical Engine Ready.")

  def _extract_status_code(self, error_text: str) -> int:
    if "429" in error_text:
      return 429
    if "503" in error_text or "UNAVAILABLE" in error_text:
      print(error_text)
      return 503
    if "504" in error_text:
      return 504
    return 500

  def _normalize_language(self, language: str) -> str:
    key = (language or "English").strip().lower()
    return _LANGUAGE_MAP.get(key, language.strip() if language else "English")

  def _collect_user_facing_text(self, data: dict) -> list[str]:
    texts: list[str] = []

    def add(value):
      if isinstance(value, str) and value.strip():
        texts.append(value.strip())

    add(data.get("health_summary"))
    add(data.get("doctors_narrative"))

    for test in data.get("tests", []) or []:
      add(test.get("explanation"))

    for pattern in data.get("patterns", []) or []:
      add(pattern.get("explanation"))
      add(pattern.get("dietary_note"))
      for symptom in pattern.get("symptoms", []) or []:
        add(symptom)
      for question in pattern.get("doctor_questions", []) or []:
        add(question)

    path_to_normal = data.get("path_to_normal", {}) or {}
    add(path_to_normal.get("activity_prescription"))
    for swap in path_to_normal.get("dietary_swaps", []) or []:
      add(swap)

    for question in data.get("doctor_questions", []) or []:
      add(question)

    for specialist in data.get("recommended_specialists", []) or []:
      add(specialist.get("reason"))

    for item in (data.get("curated_resources", {}) or {}).get("youtube", []) or []:
      add(item.get("title"))
    for item in (data.get("curated_resources", {}) or {}).get("articles", []) or []:
      add(item.get("title"))

    return texts

  def _is_predominantly_english(self, texts: list[str]) -> bool:
    if not texts:
      return False

    sample = " ".join(texts)
    letters = re.findall(r"[A-Za-z]", sample)
    non_ascii_letters = re.findall(r"[^\x00-\x7F]", sample)
    if not letters and non_ascii_letters:
      return False
    if not letters:
      return False

    ascii_ratio = len(letters) / max(1, len(letters) + len(non_ascii_letters))
    return ascii_ratio > 0.85

  def _translate_to_language(self, data: dict, language: str) -> dict:
    if not self.client:
      return data

    payload = json.dumps(data, ensure_ascii=False)
    prompt = TRANSLATION_PROMPT.format(language=language, json_payload=payload)

    response = self.client.models.generate_content(
      model=self.model,
      contents=prompt,
      config=types.GenerateContentConfig(
        system_instruction="Return only translated JSON. Keep keys unchanged.",
        response_mime_type="application/json",
        temperature=0.0,
      ),
    )

    translated = json.loads(response.text)
    return translated[0] if isinstance(translated, list) else translated

  def _is_placeholder_reference_range(self, value: str) -> bool:
    raw = str(value or "").strip().lower()
    placeholders = {
      "", "-", "—", "na", "n/a", "none", "null",
      "0", "0.0", "0.00", "0-0", "0 to 0", "not provided",
    }
    return raw in placeholders

  def _backfill_reference_ranges_with_gemini(self, tests: list, age: int, gender: str) -> list:
    if not self.client or not tests:
      return tests

    needs_backfill = []
    for test in tests:
      reference_range = test.get("reference_range")
      if self._is_placeholder_reference_range(reference_range):
        needs_backfill.append(
          {
            "test_name": test.get("test_name", ""),
            "value": test.get("value", ""),
            "unit": test.get("unit", ""),
            "status": test.get("status", ""),
          }
        )

    if not needs_backfill:
      return tests

    prompt = REFERENCE_RANGE_BACKFILL_PROMPT.format(
      age=age,
      gender_full="Male" if gender == "M" else "Female",
      tests_json=json.dumps(needs_backfill, ensure_ascii=False),
    )

    try:
      response = self.client.models.generate_content(
        model=self.model,
        contents=prompt,
        config=types.GenerateContentConfig(
          system_instruction="Return only strict JSON.",
          response_mime_type="application/json",
          temperature=0.0,
        ),
      )

      parsed = json.loads(response.text)
      payload = parsed[0] if isinstance(parsed, list) else parsed
      generated_tests = payload.get("tests", []) if isinstance(payload, dict) else []

      range_map = {
        str(item.get("test_name", "")).strip().lower(): str(item.get("reference_range", "")).strip()
        for item in generated_tests
        if str(item.get("test_name", "")).strip()
      }

      normalized = []
      for test in tests:
        test_name_key = str(test.get("test_name", "")).strip().lower()
        updated = dict(test)
        if self._is_placeholder_reference_range(updated.get("reference_range")):
          candidate = range_map.get(test_name_key, "").strip()
          if candidate and not self._is_placeholder_reference_range(candidate):
            updated["reference_range"] = candidate
        normalized.append(updated)

      return normalized
    except Exception as e:
      logger.error(f"Reference range backfill failed: {e}")
      return tests

  def _format_patient_context(self, patient_context: dict | None) -> str:
    if not isinstance(patient_context, dict):
      return "Not provided"

    known_conditions = str(patient_context.get("known_conditions") or "").strip()
    medications = str(patient_context.get("medications") or "").strip()
    smoking_status = str(patient_context.get("smoking_status") or "").strip()
    sleep_hours = str(patient_context.get("sleep_hours") or "").strip()

    parts = []
    if known_conditions:
      parts.append(f"Known conditions: {known_conditions}")
    if medications:
      parts.append(f"Current medications: {medications}")
    if smoking_status:
      parts.append(f"Smoking status: {smoking_status}")
    if sleep_hours:
      parts.append(f"Average sleep hours: {sleep_hours}")

    return "\n".join(parts) if parts else "Not provided"

  def analyze(self, report_text: str, age: int, gender: str, language: str = "English", patient_context: dict | None = None) -> dict:
    if not self.client:
      return {"error": "No API Key", "error_status_code": 500}

    language = self._normalize_language(language)

    prompt = ANALYSIS_PROMPT.format(
      age=age,
      gender_full="Male" if gender == "M" else "Female",
      language=language,
      patient_context_block=self._format_patient_context(patient_context),
      report_text=report_text[: self.max_report_chars]
    )

    try:
      response = self.client.models.generate_content(
        model=self.model,
        contents=prompt,
        config=types.GenerateContentConfig(
          system_instruction=SYSTEM_PROMPT,
          response_mime_type="application/json",
          temperature=0.1
        )
      )

      data = json.loads(response.text)
      result = data[0] if isinstance(data, list) else data

      tests = result.get("tests") or []
      if isinstance(tests, list) and tests:
        result["tests"] = self._backfill_reference_ranges_with_gemini(tests, age, gender)

      if language in _NON_ENGLISH_LANGUAGES:
        user_text = self._collect_user_facing_text(result)
        if self._is_predominantly_english(user_text):
          logger.warning(f"Primary analysis returned mostly English text for language={language}; running translation pass.")
          try:
            result = self._translate_to_language(result, language)
          except Exception as translate_err:
            logger.error(f"Translation fallback failed: {translate_err}")

      return result

    except Exception as e:
      error_text = (str(e) or repr(e)).strip()
      if not error_text:
        error_text = "Unknown Gemini analysis error"
      logger.error(f"Analysis Failed: {error_text}")
      return {
        "error": error_text,
        "error_status_code": self._extract_status_code(error_text),
        "error_type": "analysis_failed",
      }

_INSTANCE = None
def get_analyzer():
    global _INSTANCE
    if _INSTANCE is None: _INSTANCE = MedicalAnalyzer()
    return _INSTANCE
