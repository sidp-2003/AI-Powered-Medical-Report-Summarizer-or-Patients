from __future__ import annotations
import io
import os
import time
import pypdf
from dataclasses import dataclass, field
from loguru import logger
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()


@dataclass
class ExtractionResult:
    raw_text: str
    method_used: str
    ocr_confidence: float
    warnings: list[str] = field(default_factory=list)


class DocumentExtractor:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.ocr_model = os.environ.get("GEMINI_OCR_MODEL", "").strip()
        if not self.ocr_model:
            raise RuntimeError("GEMINI_OCR_MODEL is not set in environment")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.retry_delay_seconds = max(0.0, float(os.environ.get("OCR_RETRY_DELAY_SECONDS", "1.0")))

    def _is_transient_ocr_error(self, error_text: str) -> bool:
        normalized = (error_text or "").lower()
        transient_tokens = [
            "503",
            "unavailable",
            "high demand",
            "rate limit",
            "resource exhausted",
            "deadline exceeded",
            "timeout",
        ]
        return any(token in normalized for token in transient_tokens)

    def _extract_pdf_text(self, data: bytes) -> ExtractionResult:
        try:
            reader = pypdf.PdfReader(io.BytesIO(data))
            text = "\n".join([page.extract_text() or "" for page in reader.pages])
            word_count = len(text.split())
            logger.info(f"pypdf extracted {word_count} words from {len(reader.pages)} pages.")
            if word_count < 20:
                return ExtractionResult(
                    text,
                    "pypdf",
                    0.5,
                    ["Very little text extracted. PDF may be image-based or scanned."],
                )
            return ExtractionResult(text, "pypdf", 1.0)
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return ExtractionResult("", "error", 0.0, [str(e)])

    def _extract_image_text(self, data: bytes, mime_type: str) -> ExtractionResult:
        if not self.client:
            return ExtractionResult("", "error", 0.0, ["GEMINI_API_KEY is required for image OCR."])

        prompt = (
            "Extract all readable text from this medical report image. "
            "Return plain text only. Preserve numbers, units, ranges, and test names exactly."
        )

        attempt = 0
        while True:
            attempt += 1
            try:
                response = self.client.models.generate_content(
                    model=self.ocr_model,
                    contents=[
                        types.Content(
                            role="user",
                            parts=[
                                types.Part.from_text(text=prompt),
                                types.Part.from_bytes(data=data, mime_type=mime_type),
                            ],
                        )
                    ],
                    config=types.GenerateContentConfig(temperature=0),
                )
                text = (response.text or "").strip()
                if not text:
                    return ExtractionResult("", "gemini_ocr", 0.0, ["Could not extract text from image."])
                return ExtractionResult(text, "gemini_ocr", 0.9)
            except Exception as e:
                last_error = str(e)
                if self._is_transient_ocr_error(last_error):
                    logger.warning(
                        f"Image OCR transient failure (attempt {attempt}). Retrying in {self.retry_delay_seconds}s: {last_error}"
                    )
                    time.sleep(self.retry_delay_seconds)
                    continue
                logger.error(f"Image OCR failed: {last_error}")
                return ExtractionResult("", "error", 0.0, [last_error or "Image OCR failed."])

    def extract_from_bytes(self, data: bytes, mime_type: str, filename: str = "") -> ExtractionResult:
        normalized_mime = (mime_type or "").lower()
        extension = filename.lower().split(".")[-1] if "." in filename else ""

        if "pdf" in normalized_mime or extension == "pdf":
            return self._extract_pdf_text(data)

        if normalized_mime in {"image/png", "image/jpeg", "image/jpg"} or extension in {"png", "jpg", "jpeg"}:
            effective_mime = normalized_mime if normalized_mime.startswith("image/") else f"image/{'jpeg' if extension in {'jpg', 'jpeg'} else 'png'}"
            return self._extract_image_text(data, effective_mime)

        return ExtractionResult("", "error", 0.0, ["Unsupported file type. Please upload PDF, PNG, JPG, or JPEG."])


_INSTANCE = None

def get_extractor():
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = DocumentExtractor()
    return _INSTANCE