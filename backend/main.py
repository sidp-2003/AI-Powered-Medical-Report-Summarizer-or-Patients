from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import io
import os
import json
import smtplib
from email.message import EmailMessage
import pypdf
from pipeline.analyzer import get_analyzer
from pipeline.chatbot import get_chat_manager
from pipeline.comparator import get_comparator
from pipeline.ocr import get_extractor
from pipeline.pdf_report import generate_pdf
from pipeline.comparison_pdf import generate_comparison_pdf
from database import save_report, get_reports_by_user, get_report_by_id, save_test_reminder, get_test_reminders_by_user, report_belongs_to_user, get_due_reminders_by_user, mark_reminder_as_notified, mark_reminder_as_emailed, delete_report_for_user
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
cors_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app = FastAPI(title="ClariMed API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MedicalTest(BaseModel):
    test_name: str
    value: float | str
    unit: str
    status: str
    reference_range: str
    deviation_pct: float
    explanation: str
    category: str
    severity: str
    gauge_position: float

class PathToNormal(BaseModel):
    dietary_swaps: List[str]
    activity_prescription: str

class Resource(BaseModel):
    title: str
    url: str

class CuratedResources(BaseModel):
    youtube: List[Resource]
    articles: List[Resource]

class Specialist(BaseModel):
    specialty: str
    emoji: str
    reason: str
    maps_query: str

class MedicalPattern(BaseModel):
    name: str
    confidence: float
    urgency: str
    severity: str
    explanation: str
    symptoms: List[str]
    doctor_questions: List[str]
    dietary_note: str
    icd10: str
    matched_tests: List[str]

class AnalysisResponse(BaseModel):
    id: Optional[str] = None
    created_at: Optional[str] = None
    health_score: int
    health_grade: str
    health_summary: str
    doctors_narrative: str
    tests: List[MedicalTest]
    patterns: Optional[List[MedicalPattern]] = []
    path_to_normal: PathToNormal
    curated_resources: CuratedResources
    recommended_specialists: Optional[List[Specialist]] = []

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: dict

class CompareRequest(BaseModel):
    report1_id: str
    report2_id: str


class ReminderRequest(BaseModel):
    user_email: str
    remind_in_days: int
    report_id: Optional[str] = None
    health_score: Optional[int] = None


class MarkReminderNotifiedRequest(BaseModel):
    user_email: str


class TestReminderEmailRequest(BaseModel):
    user_email: str
    report_id: Optional[str] = None


def _send_due_reminder_email(user_email: str, reminder: dict, report: Optional[dict]) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587").strip() or "587")
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM", smtp_user).strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() not in {"0", "false", "no"}

    if not smtp_host or not smtp_from:
        logger.warning("SMTP not configured (SMTP_HOST/SMTP_FROM missing). Skipping reminder email.")
        return False

    report_summary = ""
    if report:
        predicted = ""
        patterns = report.get("patterns") or []
        if patterns:
            top = sorted(patterns, key=lambda p: p.get("confidence", 0), reverse=True)[0]
            predicted = str(top.get("name") or "").strip()

        report_summary = (
            f"\n\nReport details:\n"
            f"- Report ID: {report.get('id', 'N/A')}\n"
            f"- Health Score: {report.get('health_score', 'N/A')}\n"
            f"- Predicted Condition: {predicted or 'N/A'}\n"
            f"- Health Summary: {report.get('health_summary', 'N/A')}\n"
        )

    body = (
        f"Hello,\n\n"
        f"This is your ClariMed reminder that your scheduled follow-up is due.\n\n"
        f"Reminder details:\n"
        f"- Reminder ID: {reminder.get('id', 'N/A')}\n"
        f"- Due At: {reminder.get('due_at', 'N/A')}\n"
        f"- Planned Interval: {reminder.get('remind_in_days', 'N/A')} days\n"
        f"- Recorded Health Score: {reminder.get('health_score', 'N/A')}\n"
        f"- Linked Report ID: {reminder.get('report_id', 'N/A')}"
        f"{report_summary}\n"
        f"Please log in to ClariMed to review your latest report and next steps.\n\n"
        f"Regards,\nClariMed"
    )

    message = EmailMessage()
    message["Subject"] = "ClariMed Reminder: Follow-up due"
    message["From"] = smtp_from
    message["To"] = user_email
    message.set_content(body)

    if report:
        try:
            patient_age = int(report.get("patient_age") or 30)
        except Exception:
            patient_age = 30
        patient_gender = str(report.get("patient_gender") or "M")
        patient_name = str(report.get("patient_name") or "Patient")

        try:
            report_pdf_bytes = generate_pdf(
                report,
                patient_name=patient_name,
                patient_age=patient_age,
                patient_gender=patient_gender,
            )
            attachment_name = f"ClariMed_Previous_Report_{report.get('id', 'report')}.pdf"
            message.add_attachment(
                report_pdf_bytes,
                maintype="application",
                subtype="pdf",
                filename=attachment_name,
            )
        except Exception as exc:
            logger.error(f"Failed generating report PDF attachment for email to {user_email}: {exc}")

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
            smtp.ehlo()
            if use_tls:
                smtp.starttls()
                smtp.ehlo()
            if smtp_user and smtp_password:
                smtp.login(smtp_user, smtp_password)
            smtp.send_message(message)
        return True
    except Exception as exc:
        logger.error(f"Failed to send reminder email to {user_email}: {exc}")
        return False

@app.get("/")
def home():
    return {
        "status": "online",
        "engine": os.getenv("GEMINI_ANALYZER_MODEL", "gemini-2.5-flash"),
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_report(
    file: UploadFile = File(...),
    age: int = Form(...),
    gender: str = Form(...),
    language: str = Form(...),
    patient_context: Optional[str] = Form(None),
    user_email: Optional[str] = Form(None),
):
    filename = (file.filename or "").lower()
    supported_extensions = (".pdf", ".png", ".jpg", ".jpeg")
    if not filename.endswith(supported_extensions):
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF, PNG, JPG, or JPEG.")
    try:
        content = await file.read()
        extractor = get_extractor()
        extraction = extractor.extract_from_bytes(content, file.content_type or "", file.filename or "")
        text = extraction.raw_text

        if not text.strip():
            warning = extraction.warnings[0] if extraction.warnings else "Could not extract text from uploaded file."
            transient_tokens = ["temporarily unavailable", "high demand", "unavailable", "503", "rate limit"]
            if any(token in warning.lower() for token in transient_tokens):
                raise HTTPException(status_code=503, detail="OCR service is currently under high load. Please retry in a few moments.")
            raise HTTPException(status_code=422, detail=warning)

        # Map gender string to M/F for the analyzer
        gender_code = "M" if gender.lower().startswith("m") else "F"
        parsed_context = {}
        if patient_context:
            try:
                parsed_context = json.loads(patient_context)
            except Exception:
                parsed_context = {}

        logger.info(
            f"Analyzing file: {file.filename} (age={age}, gender={gender_code}, extraction={extraction.method_used})"
        )
        analyzer = get_analyzer()
        result = analyzer.analyze(text, age, gender_code, language, parsed_context)

        if "error" in result:
            status_code = int(result.get("error_status_code", 500))
            raw_error = (result.get("error") or "").strip() or "Analysis failed"
            if status_code == 503:
                detail = "Gemini is currently under high load. Please retry in a few moments."
            else:
                detail = raw_error
            raise HTTPException(status_code=status_code, detail=detail)

        storage_user = (user_email or "anonymous@local").strip().lower()
        result_to_save = {
            **result,
            "patient_age": age,
            "patient_gender": gender_code,
            "report_language": language,
            "patient_context": parsed_context,
            "source_filename": file.filename or "uploaded_file",
        }

        saved_report = None
        try:
            report_id = save_report(storage_user, result_to_save)
            saved_report = get_report_by_id(report_id)
        except Exception as db_err:
            logger.error(f"Failed to save report to DB: {db_err}")

        return saved_report or result_to_save

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports/{user_email}")
async def get_user_reports(user_email: str):
    try:
        normalized_email = (user_email or "").strip().lower()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="user_email is required")

        reports = get_reports_by_user(normalized_email)
        return {"reports": reports}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"DB Error getting reports: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/report/{report_id}")
async def get_single_report(report_id: str):
    try:
        report = get_report_by_id(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"report": report}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        logger.error(f"DB Error getting report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/report/{report_id}")
async def delete_single_report(report_id: str, user_email: str):
    try:
        normalized_email = (user_email or "").strip().lower()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="user_email is required")

        deleted = delete_report_for_user(report_id, normalized_email)
        if not deleted:
            raise HTTPException(status_code=404, detail="Report not found")

        return {"deleted": True, "report_id": report_id}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"DB Error deleting report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_interaction(req: ChatRequest):
    try:
        chatbot = get_chat_manager()
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in req.history]
        result = chatbot.chat(req.message, history_dicts, req.context)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return {"reply": result["reply"]}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Chat API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reminders")
async def create_reminder(req: ReminderRequest):
    try:
        user_email = (req.user_email or "").strip().lower()
        if not user_email:
            raise HTTPException(status_code=400, detail="user_email is required")
        if req.remind_in_days <= 0:
            raise HTTPException(status_code=400, detail="remind_in_days must be greater than 0")
        if req.report_id and not report_belongs_to_user(req.report_id, user_email):
            raise HTTPException(status_code=400, detail="report_id does not belong to this user")

        reminder = save_test_reminder(
            user_email=user_email,
            remind_in_days=req.remind_in_days,
            report_id=req.report_id,
            health_score=req.health_score,
        )
        return {"reminder": reminder}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Reminder API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/reminders/{user_email}")
async def get_user_reminders(user_email: str):
    try:
        normalized_email = (user_email or "").strip().lower()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="user_email is required")

        reminders = get_test_reminders_by_user(normalized_email)
        return {"reminders": reminders}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Reminder Fetch API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/reminders/due/{user_email}")
async def get_due_reminders(user_email: str):
    try:
        normalized_email = (user_email or "").strip().lower()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="user_email is required")

        reminders = get_due_reminders_by_user(normalized_email)

        for reminder in reminders:
            already_emailed = reminder.get("email_sent_at")
            if already_emailed:
                continue
            linked_report = None
            reminder_report_id = reminder.get("report_id")
            if reminder_report_id:
                linked_report = get_report_by_id(reminder_report_id)
            email_sent = _send_due_reminder_email(normalized_email, reminder, linked_report)
            if email_sent:
                mark_reminder_as_emailed(reminder.get("id"), normalized_email)

        return {"reminders": reminders}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Due Reminder Fetch API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reminders/test-email")
async def send_test_reminder_email(req: TestReminderEmailRequest):
    try:
        user_email = (req.user_email or "").strip().lower()
        if not user_email:
            raise HTTPException(status_code=400, detail="user_email is required")

        report = None
        if req.report_id:
            report = get_report_by_id(req.report_id)
        if not report:
            user_reports = get_reports_by_user(user_email)
            if user_reports:
                report = user_reports[0]

        reminder_payload = {
            "id": f"test-{os.urandom(4).hex()}",
            "due_at": "in ~5 seconds (test)",
            "remind_in_days": 0,
            "health_score": report.get("health_score") if report else None,
            "report_id": report.get("id") if report else None,
        }

        sent = _send_due_reminder_email(user_email, reminder_payload, report)
        if not sent:
            raise HTTPException(status_code=500, detail="Failed to send test reminder email. Check SMTP config and credentials.")

        return {
            "sent": True,
            "to": user_email,
            "report_id": reminder_payload.get("report_id"),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Test Reminder Email API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reminders/{reminder_id}/mark-notified")
async def mark_notified(reminder_id: str, req: MarkReminderNotifiedRequest):
    try:
        user_email = (req.user_email or "").strip().lower()
        if not user_email:
            raise HTTPException(status_code=400, detail="user_email is required")

        updated = mark_reminder_as_notified(reminder_id, user_email)
        return {"updated": updated}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Mark Reminder Notified API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ExportPDFRequest(BaseModel):
    analysis: dict
    patient_name: str = "Patient"
    age: int = 30
    gender: str = "M"

@app.post("/export/pdf")
async def export_pdf(req: ExportPDFRequest):
    try:
        pdf_bytes = generate_pdf(
            req.analysis,
            patient_name=req.patient_name,
            patient_age=req.age,
            patient_gender=req.gender,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="ClariMed_Report.pdf"'},
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/pdf")
async def analyze_and_download_pdf(
    file: UploadFile = File(...),
    age: int = Form(...),
    gender: str = Form(...),
    patient_name: str = Form("Patient"),
    language: str = Form("en"),
    medications: Optional[str] = Form(None),
    user_email: Optional[str] = Form(None),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        content = await file.read()
        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
        text = "\n".join([page.extract_text() or "" for page in pdf_reader.pages])

        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

        logger.info(f"Analyzing file for PDF report: {file.filename}")
        analyzer = get_analyzer()
        gender_code = "M" if gender.lower().startswith("m") else "F"
        analysis = analyzer.analyze(text, age, gender_code, language)

        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis["error"])

        storage_user = (user_email or "anonymous@local").strip().lower()
        analysis_to_save = {
            **analysis,
            "patient_age": age,
            "patient_gender": gender_code,
            "report_language": language,
            "source_filename": file.filename or "uploaded_file",
        }
        try:
            save_report(storage_user, analysis_to_save)
        except Exception as db_err:
            logger.error(f"Failed to save report from /analyze/pdf to DB: {db_err}")

        pdf_bytes = generate_pdf(
            analysis,
            patient_name=patient_name,
            patient_age=age,
            patient_gender=gender,
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="ClariMed_Report.pdf"'},
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare")
async def compare_reports(req: CompareRequest):
    try:
        report1 = get_report_by_id(req.report1_id)
        report2 = get_report_by_id(req.report2_id)
        
        if not report1 or not report2:
            raise HTTPException(status_code=404, detail="One or both reports not found")
            
        comparator = get_comparator()
        result = comparator.compare(report1, report2)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
            
        return {"comparison": result, "report1": report1, "report2": report2}
        
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        logger.error(f"Compare API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ComparisonPDFRequest(BaseModel):
    report1: dict
    report2: dict
    comparison: dict

@app.post("/export/comparison-pdf")
async def export_comparison_pdf(req: ComparisonPDFRequest):
    try:
        pdf_bytes = generate_comparison_pdf(
            req.report1,
            req.report2,
            req.comparison,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="ClariMed_Comparison_Report.pdf"'},
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Comparison PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)