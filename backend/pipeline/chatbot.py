from google import genai
from google.genai import types
import os
import json
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

CHAT_SYSTEM_PROMPT = """You are a friendly, warm, and helpful Medical Assistant.
You are helping a patient understand their recent blood test results.
Your tone should be comforting, supportive, and accessible (avoid overly dense medical jargon).
You have access to the patient's analysis context below.
Answer their questions based on the provided data, give general lifestyle/dietary advice, and explain the findings gently.
Do not add repetitive disclaimer paragraphs in every response.
Only include a brief safety reminder when the user asks for diagnosis, treatment decisions, or medication changes.
Keep your answers relatively concise, readable, and structured (use bullet points if helpful).

Patient Analysis Context:
{analysis_context}
"""

class ChatManager:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.model = os.environ.get("GEMINI_CHAT_MODEL", "").strip()
        if not self.model:
            raise RuntimeError("GEMINI_CHAT_MODEL is not set in environment")
        self.max_context_chars = int(os.environ.get("CHAT_CONTEXT_MAX_CHARS", "8000"))
        if self.client: logger.info("Gemini 3 Chat Engine Ready.")

    def chat(self, user_message: str, history: list, analysis_data: dict) -> dict:
        if not self.client: return {"error": "No API Key"}

        # Prepare a slimmed down context to save tokens, or just pass the whole dict
        context_str = json.dumps(analysis_data, indent=2)[: self.max_context_chars]

        prompt = CHAT_SYSTEM_PROMPT.format(analysis_context=context_str)

        # Build contents array
        # history should be in the format [{"role": "user"/"model", "content": "..."}]
        contents = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))])
            )
        
        # Add the latest user message
        contents.append(
            types.Content(role="user", parts=[types.Part.from_text(text=user_message)])
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=prompt,
                    temperature=0.7,
                )
            )
            cleaned_reply = self._sanitize_reply(response.text or "")
            return {"reply": cleaned_reply}

        except Exception as e:
            logger.error(f"Chatbot failed: {e}")
            return {"error": str(e)}

    def _sanitize_reply(self, text: str) -> str:
        if not text:
            return text

        patterns_to_remove = [
            "Important Note: I am an AI, not a doctor.",
            "Because your biopsy report indicates the presence of cancer",
            "schedule an appointment with an oncologist or a urologist as soon as possible",
            "Do you have any other questions about the specialists or the terms in your report?"
        ]

        lowered = text.lower()
        if all(p.lower() in lowered for p in patterns_to_remove[:2]):
            cleaned_lines = []
            for line in text.splitlines():
                line_lower = line.lower().strip()
                if (
                    "important note: i am an ai, not a doctor" in line_lower
                    or "because your biopsy report indicates the presence of cancer" in line_lower
                    or "schedule an appointment with an oncologist or a urologist" in line_lower
                    or "do you have any other questions about the specialists or the terms in your report" in line_lower
                ):
                    continue
                cleaned_lines.append(line)
            text = "\n".join(cleaned_lines)

        additional_disclaimer_phrases = [
            "please remember: while i am here to help you understand these results",
            "please follow the specific treatment plan your doctor has provided",
            "if you notice your breathing becoming significantly more difficult",
            "seek emergency care right away",
        ]

        filtered_lines = []
        for line in text.splitlines():
            line_lower = line.lower().strip().strip("*")
            if any(phrase in line_lower for phrase in additional_disclaimer_phrases):
                continue
            filtered_lines.append(line)
        text = "\n".join(filtered_lines)

        text = "\n".join([line.rstrip() for line in text.splitlines()])
        while "\n\n\n" in text:
            text = text.replace("\n\n\n", "\n\n")

        return text.strip()

_CHAT_INSTANCE = None
def get_chat_manager():
    global _CHAT_INSTANCE
    if _CHAT_INSTANCE is None: _CHAT_INSTANCE = ChatManager()
    return _CHAT_INSTANCE
