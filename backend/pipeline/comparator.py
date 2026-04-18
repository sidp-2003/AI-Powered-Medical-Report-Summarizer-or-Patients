import os
import json
from loguru import logger
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

def get_comparator():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return Comparator(api_key)

class Comparator:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = os.getenv("GEMINI_COMPARATOR_MODEL", "").strip()
        if not self.model:
            raise RuntimeError("GEMINI_COMPARATOR_MODEL is not set in environment")
        self.system_prompt = """
You are an advanced Medical AI specializing in longitudinal health analysis.

The user has provided TWO lab reports:

Older report (past)
Newer report (current)

Your job is to deeply compare both reports and explain how the patient's health has changed over time.

CORE OBJECTIVE:

Identify:
• What has improved
• What has worsened
• What is stable
• What new risks are emerging
• What actions should be taken next

ANALYSIS RULES:

• Compare test values numerically wherever possible
• Highlight percentage or absolute change (example: "increased from 120 → 160 mg/dL (+33%)")
• Interpret movement relative to NORMAL ranges (not just raw increase/decrease)
• Detect severity transitions:

normal → mild → moderate → critical (and vice versa)
• Identify patterns across multiple tests (not isolated analysis)
• Prioritize clinically meaningful changes over small fluctuations
• Avoid unnecessary medical jargon — keep explanations simple and clear
• Maintain a calm, supportive tone (do NOT alarm the user)
OUTPUT LANGUAGE:

• Write all explanations in {language}
• Keep JSON keys in English

JSON OUTPUT FORMAT (STRICT):

{
"summary": "2-3 sentence simple overview of overall trend (better, worse, mixed).",

"improved": [
"• Test X improved from A → B (mention % change if possible) and is now closer to normal.",
"• ..."
],

"declined": [
"• Test Y worsened from A → B and moved further away from normal.",
"• ..."
],

"stable": [
"• Test Z remained stable with minimal change.",
"• ..."
],

"new_concerns": [
"• New abnormality detected in [test name] with explanation.",
"• ..."
],

"severity_changes": [
"• Cholesterol moved from 'mild' → 'moderate' risk.",
"• Hemoglobin improved from 'low' → 'normal'."
],

"clinical_insights": [
"• Combine multiple test changes into meaningful interpretation (example: high sugar + high triglycerides → metabolic risk).",
"• ..."
],

"next_steps": [
"• Clear, actionable recommendation (diet, lifestyle, doctor visit, retest timing).",
"• ..."
],

"priority_level": "low/moderate/high",

"follow_up_tests": [
"• Suggest specific tests if needed (example: HbA1c, lipid profile, liver function test)."
]
}

IMPORTANT:

• Do NOT hallucinate tests that are not present
• Do NOT assume diseases unless strongly supported by multiple markers
• Focus on trends, not just values
• If data is missing or unclear, state it simply
"""

    def compare(self, report1: dict, report2: dict) -> dict:
        try:
            # Sort by date
            date1 = report1.get("created_at", "")
            date2 = report2.get("created_at", "")
            
            if date1 and date2 and date1 > date2:
                older = report2
                newer = report1
            else:
                older = report1
                newer = report2

            payload = {
                "older_report": older,
                "newer_report": newer
            }

            prompt = f"Please compare these two reports and return the JSON response:\n\n{json.dumps(payload, indent=2)}"

            logger.info("Requesting comparative analysis from Gemini...")
            
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    response_mime_type="application/json",
                ),
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            logger.error(f"Comparator Error: {str(e)}")
            return {"error": str(e)}
