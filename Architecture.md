# ClariMed AI Architecture

## 1) Overview
ClariMed is a full-stack health report analysis platform with:
- **Frontend**: Next.js dashboard for upload, analysis viewing, chat, reminders, and report history
- **Backend**: FastAPI service for extraction, AI analysis, report persistence, reminders, and PDF export
- **Storage**: MongoDB for reports and reminder scheduling metadata
- **AI Layer**: Google Gemini models for OCR, analysis, chat, and report comparison

## 2) High-Level Components

### Frontend (`frontend/`)
- **App shell**: `src/app/dashboard/page.tsx`
- **Upload flow**: `src/components/dashboard/UploadPanel.tsx`
- **Results UI**: score, tests, patterns, roadmap, resources, specialists
- **History management**: `src/components/dashboard/PastReportsTab.tsx` (view, compare, download, delete)
- **Chat assistant**: `src/components/dashboard/ChatWidget.tsx` (text + voice input)
- **Notifications UX**: reminder modal, due-reminder polling, test reminder trigger

### Backend (`backend/`)
- **API entrypoint**: `main.py`
- **Data access**: `database.py` (MongoDB collections, indexes, CRUD)
- **AI + processing pipeline** (`pipeline/`):
  - `ocr.py`: text extraction from PDF/images
  - `analyzer.py`: structured medical analysis JSON generation
  - `chatbot.py`: contextual assistant replies
  - `comparator.py`: longitudinal comparison between reports
  - `pdf_report.py`: single-report PDF generation
  - `comparison_pdf.py`: comparison PDF generation

## 3) Core Request Flows

### A) Analyze Report
1. Frontend uploads report + profile/language context to `POST /analyze`
2. Backend extracts text via `pipeline/ocr.py`
3. Analyzer generates structured result via Gemini (`pipeline/analyzer.py`)
4. Backend stores report in MongoDB (`database.py`)
5. Frontend renders dashboard cards/charts/actions

### B) Chat About Report
1. Frontend sends message + prior chat + report context to `POST /chat`
2. Backend chat manager (`pipeline/chatbot.py`) calls Gemini
3. Response returned and rendered in chat widget

### C) Compare Two Reports
1. Frontend sends selected report IDs to `POST /compare`
2. Backend fetches both reports from MongoDB
3. Comparator generates trend summary and clinical deltas
4. Frontend displays comparison insights and charting
5. Optional `POST /export/comparison-pdf` to download comparison report

### D) Reminder Lifecycle
1. User creates reminder via `POST /reminders`
2. Reminder stored in MongoDB reminders collection
3. Frontend periodically calls `GET /reminders/due/{user_email}`
4. Backend sends due reminder email via SMTP and marks reminder as emailed

## 4) Data Model Summary

### Reports Collection
Stores per-report payload:
- `id`
- `user_email`
- `created_at`
- `health_score`
- `report_json` (full analysis object)

### Reminders Collection
Stores reminder metadata:
- `id`
- `user_email`
- `report_id` (optional link)
- `health_score`
- `remind_in_days`
- `created_at`, `due_at`
- `status`
- `notification_sent_at`
- `email_sent_at`

## 5) Integrations
- **Gemini API**: clinical analysis + chat + compare + OCR
- **MongoDB**: persistent report/reminder storage
- **SMTP**: reminder email delivery (including report PDF attachment)

## 6) Configuration (Environment)
Configured in `backend/.env`:
- Gemini model/API settings
- MongoDB connection + collection names
- SMTP host/credentials/sender details
- OCR retry tuning (`OCR_MAX_RETRIES`, `OCR_RETRY_DELAY_SECONDS`)

## 7) Deployment Notes
- Backend runs as FastAPI (`uvicorn main:app`)
- Frontend runs as Next.js (`npm run dev`)
- MongoDB must be reachable from backend runtime
- SMTP credentials must be valid for reminder email delivery
