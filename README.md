# 🛡️ Sentinels: ClariMed AI

### 👥 Team Members
1. **Paras Ningune**
2. **Soham Mane**
3. **Siddhant Pote**

---

## 📝 Description
**ClariMed AI** converts complex pathology reports into clear, actionable insights for patients and clinicians.

The platform uses **Google Gemini models** (configurable via environment variables) to analyze uploaded lab reports, detect clinical patterns, generate health scores, explain results in patient-friendly language, and support follow-up workflows with reminder emails and report history management.

---

## ✨ Current Key Features

### 🖥️ Frontend (Next.js)
- **Modern dashboard UX** with upload, analysis, trends, and report history tabs.
- **Multilingual interface** support (English, Hindi, Marathi, Tamil, Telugu, Bengali).
- **AI chat assistant** for report Q&A and one-click “explain condition/score” flows.
- **Voice input in chat** with support for **English, Hindi, and Marathi**.
- **Past reports manager**: view, compare, download PDF, and delete unnecessary reports.
- **Health explainability UI**: score tooltip + guided interpretation prompts.

### ⚙️ Backend (FastAPI + Gemini + MongoDB)
- **Multi-format ingestion**: supports `.pdf`, `.png`, `.jpg`, `.jpeg` uploads.
- **Deep medical analysis pipeline** with structured JSON output.
- **Clinical pattern extraction** and specialist guidance generation.
- **Comparison engine** for old vs latest report trend interpretation.
- **PDF generation** for both single-report and comparison-report exports.
- **Reminder system** with scheduled follow-up tracking in MongoDB.
- **Email reminder delivery (SMTP)** including **attached previous report PDF**.

---

## 🧱 Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts
- **Backend**: FastAPI, Pydantic, Loguru, PyMongo, Python-dotenv
- **AI**: Google Gemini (model names configurable via env)
- **Document processing**: pypdf + OCR pipeline
- **Reporting**: ReportLab-based PDF generation
- **Data store**: MongoDB

---

## ✅ Prerequisites
- **Python 3.10+**
- **Node.js 18+** (recommended for Next.js)
- **MongoDB** instance (local or hosted)
- **Gemini API key**
- **SMTP credentials** (for reminder email delivery)

---

## 🚀 Setup & Run

### 1) Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` and configure values:

```dotenv
# Gemini
GEMINI_API_KEY=your_key_here
GEMINI_ANALYZER_MODEL=gemini-2.5-flash
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_COMPARATOR_MODEL=gemini-2.5-flash
GEMINI_OCR_MODEL=gemini-2.5-flash

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/?directConnection=true
MONGODB_DB_NAME=medisense
MONGODB_REPORTS_COLLECTION=reports
MONGODB_REMINDERS_COLLECTION=reminders

# SMTP (reminder emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_smtp_app_password
SMTP_FROM=your_email@example.com
SMTP_USE_TLS=true

# Optional
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Run backend:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger docs: http://localhost:8000/docs

### 2) Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Run frontend:
```bash
npm run dev
```

Open: http://localhost:3000

---

## 🔌 API Endpoints (Current)

### Core
- `GET /` — service health/status
- `POST /analyze` — analyze uploaded report and return structured JSON
- `POST /analyze/pdf` — analyze and directly return generated PDF
- `POST /chat` — report-aware AI conversation

### Reports
- `GET /reports/{user_email}` — fetch all reports for a user
- `GET /report/{report_id}` — fetch single report
- `DELETE /report/{report_id}?user_email=...` — delete a report (and linked reminders)

### Comparisons
- `POST /compare` — compare two reports
- `POST /export/comparison-pdf` — download comparison PDF

### Exports
- `POST /export/pdf` — export standard report PDF

### Reminders
- `POST /reminders` — create reminder
- `GET /reminders/{user_email}` — list reminders
- `GET /reminders/due/{user_email}` — process due reminders and trigger email delivery
- `POST /reminders/test-email` — send test reminder email
- `POST /reminders/{reminder_id}/mark-notified` — mark reminder as notified (in-app flow)

---

## 📁 Project Structure (High Level)

```text
backend/
├── main.py
├── database.py
├── requirements.txt
└── pipeline/
    ├── analyzer.py
    ├── chatbot.py
    ├── comparator.py
    ├── ocr.py
    ├── pdf_report.py
    └── comparison_pdf.py

frontend/
├── package.json
└── src/
    ├── app/
    └── components/
        └── dashboard/
```

---

## 🔐 Security Note
- Never commit real secrets (API keys, DB credentials, SMTP passwords) to version control.
- Keep sensitive values in local env files and rotate credentials if accidentally exposed.
