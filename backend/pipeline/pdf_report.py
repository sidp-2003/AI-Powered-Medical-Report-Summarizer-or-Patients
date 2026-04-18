"""
pipeline/pdf_report.py
Generates a comprehensive, well-formatted PDF health report from analysis results.

Usage:
    from pipeline.pdf_report import generate_pdf
    pdf_bytes = generate_pdf(analysis_result, patient_info)

Install:
    pip install reportlab
"""

from __future__ import annotations
import io
import os
from datetime import datetime
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import Drawing, Rect, String, Circle
from reportlab.graphics import renderPDF
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

_PDF_FONT_REGULAR = "Helvetica"
_PDF_FONT_BOLD = "Helvetica-Bold"
_PDF_FONT_ITALIC = "Helvetica-Oblique"
_PDF_FONT_MONO = "Courier"
_PDF_FONT_MONO_BOLD = "Courier-Bold"


def _register_unicode_font(language_hint: str = "") -> None:
    global _PDF_FONT_REGULAR, _PDF_FONT_BOLD, _PDF_FONT_ITALIC, _PDF_FONT_MONO, _PDF_FONT_MONO_BOLD

    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    for path in candidates:
        if not os.path.exists(path):
            continue
        try:
            font_name = "ClariMedUnicode"
            if font_name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(font_name, path))

            _PDF_FONT_REGULAR = font_name
            _PDF_FONT_BOLD = font_name
            _PDF_FONT_ITALIC = font_name
            _PDF_FONT_MONO = font_name
            _PDF_FONT_MONO_BOLD = font_name
            return
        except Exception:
            continue


def _walk_flowables(items):
    for item in items:
        yield item

        if isinstance(item, KeepTogether):
            nested = getattr(item, "_content", None) or getattr(item, "_flowables", None) or []
            for child in _walk_flowables(nested):
                yield child

        if isinstance(item, Table):
            for row in getattr(item, "_cellvalues", []) or []:
                for cell in row:
                    if isinstance(cell, list):
                        for child in _walk_flowables(cell):
                            yield child
                    elif isinstance(cell, Flowable):
                        for child in _walk_flowables([cell]):
                            yield child


def _apply_unicode_font_overrides(story):
    for flowable in _walk_flowables(story):
        if isinstance(flowable, Paragraph):
            current = getattr(flowable.style, "fontName", "")
            flowable.style.fontName = _PDF_FONT_BOLD if "Bold" in current else _PDF_FONT_REGULAR
        elif isinstance(flowable, Table):
            rows = getattr(flowable, "_nrows", 0)
            if rows > 0:
                flowable.setStyle(TableStyle([
                    ("FONTNAME", (0, 0), (-1, -1), _PDF_FONT_REGULAR),
                    ("FONTNAME", (0, 0), (-1, 0), _PDF_FONT_BOLD),
                ]))

# ─────────────────────────────────────────────────────────────
# Brand colours
# ─────────────────────────────────────────────────────────────
C_NAVY       = colors.HexColor("#0B1F3A")
C_BLUE       = colors.HexColor("#1A56DB")
C_LIGHT_BLUE = colors.HexColor("#EFF6FF")
C_GREEN      = colors.HexColor("#047857")
C_GREEN_BG   = colors.HexColor("#D1FAE5")
C_AMBER      = colors.HexColor("#B45309")
C_AMBER_BG   = colors.HexColor("#FEF3C7")
C_RED        = colors.HexColor("#B91C1C")
C_RED_BG     = colors.HexColor("#FEE2E2")
C_ORANGE     = colors.HexColor("#C2410C")
C_ORANGE_BG  = colors.HexColor("#FFEDD5")
C_GREY       = colors.HexColor("#6B7280")
C_GREY_BG    = colors.HexColor("#F9FAFB")
C_BORDER     = colors.HexColor("#E5E7EB")
C_WHITE      = colors.white

W, H = A4  # 595 x 842 pts

# ─────────────────────────────────────────────────────────────
# Status helpers
# ─────────────────────────────────────────────────────────────

STATUS_LABEL = {
    "normal":       "✓ Normal",
    "low":          "↓ Low",
    "high":         "↑ High",
    "critical_low": "↓↓ Critical Low",
    "critical_high":"↑↑ Critical High",
}

def _status_colors(status: str):
    """Returns (text_color, bg_color) for a status string."""
    m = {
        "normal":        (C_GREEN,  C_GREEN_BG),
        "low":           (C_AMBER,  C_AMBER_BG),
        "high":          (C_AMBER,  C_AMBER_BG),
        "critical_low":  (C_RED,    C_RED_BG),
        "critical_high": (C_RED,    C_RED_BG),
    }
    return m.get(status, (C_GREY, C_GREY_BG))

def _severity_color(severity: str):
    m = {
        "normal":   C_GREEN,
        "mild":     C_AMBER,
        "moderate": C_ORANGE,
        "critical": C_RED,
    }
    return m.get(severity, C_GREY)

def _grade_color(grade: str):
    m = {
        "Excellent":      C_GREEN,
        "Good":           colors.HexColor("#16A34A"),
        "Fair":           C_AMBER,
        "Needs Attention":C_ORANGE,
        "Critical":       C_RED,
    }
    return m.get(grade, C_GREY)

# ─────────────────────────────────────────────────────────────
# Curated resource links (condition → list of (label, url))
# ─────────────────────────────────────────────────────────────

RESOURCES = {
    "anemia": [
        ("MedlinePlus — Anemia Overview",        "https://medlineplus.gov/anemia.html"),
        ("WHO — Iron Deficiency Anaemia Guide",  "https://www.who.int/publications/i/item/9789241596107"),
        ("YouTube — Understanding Iron Deficiency Anemia", "https://www.youtube.com/watch?v=5RZvFiKOhWk"),
    ],
    "vitamin_d": [
        ("NIH — Vitamin D Fact Sheet",           "https://ods.od.nih.gov/factsheets/VitaminD-Consumer/"),
        ("YouTube — Vitamin D Deficiency Explained", "https://www.youtube.com/watch?v=XKnCVhK2mYo"),
        ("Harvard Health — Vitamin D & Sunlight","https://www.health.harvard.edu/staying-healthy/time-for-more-vitamin-d"),
    ],
    "diabetes": [
        ("ADA — Understanding Blood Sugar",      "https://diabetes.org/tools-support/diagnosis-treatment/blood-glucose-testing-and-management"),
        ("YouTube — Prediabetes & Diabetes Explained", "https://www.youtube.com/watch?v=APx2yFA0-B4"),
        ("CDC — Prevent Type 2 Diabetes",        "https://www.cdc.gov/diabetes/prevention/index.html"),
    ],
    "cholesterol": [
        ("AHA — Understanding Cholesterol",      "https://www.heart.org/en/health-topics/cholesterol/about-cholesterol"),
        ("YouTube — LDL vs HDL Cholesterol",     "https://www.youtube.com/watch?v=miacrvzOCm8"),
        ("NIH — DASH Diet for Heart Health",     "https://www.nhlbi.nih.gov/education/dash-eating-plan"),
    ],
    "thyroid": [
        ("ATA — Thyroid Function Tests",         "https://www.thyroid.org/thyroid-function-tests/"),
        ("YouTube — Hypothyroidism Explained",   "https://www.youtube.com/watch?v=RNwifL0f7Yg"),
        ("MedlinePlus — Thyroid Diseases",       "https://medlineplus.gov/thyroiddiseases.html"),
    ],
    "kidney": [
        ("NKF — Understanding Your Lab Values",  "https://www.kidney.org/atoz/content/understanding-your-lab-values"),
        ("YouTube — CKD & Kidney Function",      "https://www.youtube.com/watch?v=OLFmgbYfPSk"),
        ("MedlinePlus — Kidney Health",          "https://medlineplus.gov/kidneydiseases.html"),
    ],
    "liver": [
        ("AASLD — Liver Health",                 "https://www.aasld.org/"),
        ("YouTube — Liver Enzymes Explained",    "https://www.youtube.com/watch?v=IFaWCh9y-mM"),
        ("MedlinePlus — Liver Function Tests",   "https://medlineplus.gov/lab-tests/liver-function-tests/"),
    ],
    "general": [
        ("MedlinePlus — Blood Tests Overview",   "https://medlineplus.gov/laboratorytests.html"),
        ("YouTube — How to Read a Blood Test",   "https://www.youtube.com/watch?v=lZjQnmhpW-k"),
        ("WHO — Healthy Diet",                   "https://www.who.int/news-room/fact-sheets/detail/healthy-diet"),
        ("Harvard — Exercise & Health",          "https://www.health.harvard.edu/topics/exercise-and-fitness"),
    ],
}

def _pick_resources(tests: list, patterns: list) -> list:
    """Pick relevant resource categories based on findings."""
    cats = set()
    for t in tests:
        if t.get("status") in ("low", "high", "critical_low", "critical_high"):
            cat = (t.get("category") or "").lower()
            key = t.get("test_name", "").lower()
            if any(x in key for x in ["hemoglobin", "iron", "ferritin", "rbc", "mcv"]):
                cats.add("anemia")
            if "vitamin d" in key or "vit d" in key:
                cats.add("vitamin_d")
            if any(x in key for x in ["glucose", "sugar", "hba1c", "a1c"]):
                cats.add("diabetes")
            if any(x in key for x in ["cholesterol", "ldl", "hdl", "triglyceride"]):
                cats.add("cholesterol")
            if any(x in key for x in ["tsh", "thyroid", "t3", "t4"]):
                cats.add("thyroid")
            if any(x in key for x in ["creatinine", "urea", "egfr", "kidney"]):
                cats.add("kidney")
            if any(x in key for x in ["sgpt", "sgot", "alt", "ast", "bilirubin", "liver"]):
                cats.add("liver")

    for p in patterns:
        name = (p.get("name") or "").lower()
        if "anemia" in name:           cats.add("anemia")
        if "vitamin d" in name:        cats.add("vitamin_d")
        if "diabetes" in name or "prediabetes" in name: cats.add("diabetes")
        if "cholesterol" in name or "lipid" in name: cats.add("cholesterol")
        if "thyroid" in name:          cats.add("thyroid")
        if "kidney" in name:           cats.add("kidney")
        if "liver" in name:            cats.add("liver")

    cats.add("general")

    result = []
    for cat in cats:
        result.extend(RESOURCES.get(cat, []))
    # Deduplicate
    seen = set()
    unique = []
    for label, url in result:
        if url not in seen:
            seen.add(url)
            unique.append((label, url))
    return unique[:12]  # cap at 12 links

# ─────────────────────────────────────────────────────────────
# Score dial as a reportlab Drawing
# ─────────────────────────────────────────────────────────────

def _score_dial_drawing(score: int, grade: str, color) -> Drawing:
    """Draw a simple arc-style score gauge."""
    size = 110
    d = Drawing(size, size)
    cx, cy, r = size / 2, size / 2, 42

    # Background circle
    d.add(Circle(cx, cy, r, fillColor=colors.HexColor("#F3F4F6"), strokeColor=C_BORDER, strokeWidth=1))

    # Score number
    d.add(String(cx, cy + 4, str(score),
                 fontSize=26, fillColor=color,
                 textAnchor="middle", fontName=_PDF_FONT_BOLD))
    d.add(String(cx, cy - 14, "/100",
                 fontSize=9, fillColor=C_GREY,
                 textAnchor="middle", fontName=_PDF_FONT_REGULAR))
    d.add(String(cx, cy - 28, grade,
                 fontSize=8, fillColor=color,
                 textAnchor="middle", fontName=_PDF_FONT_BOLD))
    return d

def _bar_gauge_drawing(pos: float, status: str) -> Drawing:
    """Draw a horizontal vector bar gauge for the test results."""
    width, height = 80, 8
    d = Drawing(width, 16)
    
    # Background Track
    d.add(Rect(0, 4, width, height, rx=3, ry=3, fillColor=colors.HexColor("#E5E7EB"), strokeColor=None))
    
    # Normal Zone (Middle 30%)
    d.add(Rect(width * 0.35, 4, width * 0.30, height, fillColor=C_GREEN_BG, strokeColor=None))
    
    # Text labels
    d.add(String(0, 14, "L", fontSize=5, fillColor=colors.HexColor("#9CA3AF"), fontName=_PDF_FONT_BOLD))
    d.add(String(width-4, 14, "H", fontSize=5, fillColor=colors.HexColor("#9CA3AF"), fontName=_PDF_FONT_BOLD))
    
    # Marker
    try:
        pos = max(0.05, min(0.95, float(pos)))
    except (ValueError, TypeError):
        pos = 0.5
        
    cx, cy = pos * width, 4 + height / 2
    tc, bc = _status_colors(status)
    
    d.add(Circle(cx, cy, 5, fillColor=tc, strokeColor=colors.white, strokeWidth=1))
    return d

# ─────────────────────────────────────────────────────────────
# Style helpers
# ─────────────────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()
    def S(name, **kw):
        return ParagraphStyle(name, parent=base["Normal"], **kw)

    return {
        "title":       S("title",   fontSize=22, textColor=C_WHITE,
                          fontName=_PDF_FONT_BOLD, leading=28, alignment=TA_CENTER),
        "subtitle":    S("subtitle",fontSize=11, textColor=colors.HexColor("#CBD5E1"),
                          fontName=_PDF_FONT_REGULAR, alignment=TA_CENTER),
        "h1":          S("h1",      fontSize=14, textColor=C_NAVY,
                          fontName=_PDF_FONT_BOLD, spaceBefore=14, spaceAfter=6),
        "h2":          S("h2",      fontSize=11, textColor=C_NAVY,
                          fontName=_PDF_FONT_BOLD, spaceBefore=10, spaceAfter=4),
        "body":        S("body",    fontSize=9,  textColor=colors.HexColor("#374151"),
                          fontName=_PDF_FONT_REGULAR,  leading=14),
        "body_bold":   S("body_bold",fontSize=9, textColor=C_NAVY,
                          fontName=_PDF_FONT_BOLD, leading=14),
        "small":       S("small",   fontSize=8,  textColor=C_GREY,
                          fontName=_PDF_FONT_REGULAR,  leading=11),
        "cell":        S("cell",    fontSize=8,  textColor=colors.HexColor("#1F2937"),
                          fontName=_PDF_FONT_REGULAR,  leading=11),
        "cell_bold":   S("cell_bold",fontSize=8, textColor=C_NAVY,
                          fontName=_PDF_FONT_BOLD, leading=11),
        "cell_center": S("cell_center",fontSize=8, textColor=colors.HexColor("#1F2937"),
                          fontName=_PDF_FONT_REGULAR, leading=11, alignment=TA_CENTER),
        "cell_right":  S("cell_right",fontSize=8, textColor=colors.HexColor("#1F2937"),
                          fontName=_PDF_FONT_MONO, leading=11, alignment=TA_RIGHT),
        "cell_right_bold":S("cell_right_bold",fontSize=8, textColor=C_NAVY,
                          fontName=_PDF_FONT_MONO_BOLD, leading=11, alignment=TA_RIGHT),
        "gauge":       S("gauge",fontSize=8, textColor=C_NAVY, fontName=_PDF_FONT_MONO_BOLD, leading=11, alignment=TA_CENTER),
        "link":        S("link",    fontSize=8,  textColor=C_BLUE,
                          fontName=_PDF_FONT_REGULAR,  leading=13),
        "disclaimer":  S("disclaimer",fontSize=7,textColor=C_GREY,
                          fontName=_PDF_FONT_ITALIC, leading=10, alignment=TA_CENTER),
        "summary_box": S("summary_box",fontSize=9,textColor=colors.HexColor("#1E40AF"),
                          fontName=_PDF_FONT_REGULAR, leading=14),
        "pattern_name":S("pattern_name",fontSize=9,textColor=C_NAVY,
                          fontName=_PDF_FONT_BOLD, leading=13),
        "pattern_body":S("pattern_body",fontSize=8,textColor=colors.HexColor("#374151"),
                          fontName=_PDF_FONT_REGULAR, leading=12),
        "specialist_name": S("spec_name", fontSize=10, textColor=C_NAVY, fontName=_PDF_FONT_BOLD, leading=14),
        "spec_reason": S("spec_reason", fontSize=8.5, textColor=colors.HexColor("#4B5563"), fontName=_PDF_FONT_REGULAR, leading=12),
    }

# ─────────────────────────────────────────────────────────────
# Main generator
# ─────────────────────────────────────────────────────────────

def generate_pdf(
    analysis: dict,
    patient_name: str = "Patient",
    patient_age: int  = 0,
    patient_gender: str = "M",
    report_date: Optional[str] = None,
) -> bytes:
    """
    Generate a comprehensive PDF health report.

    Args:
        analysis:       The dict returned by MedicalAnalyzer.analyze()
        patient_name:   Patient's name for the header
        patient_age:    Patient's age
        patient_gender: "M" or "F"
        report_date:    Date string (defaults to today)

    Returns:
        PDF as bytes — write to file or return in HTTP response.
    """
    report_language = str(analysis.get("report_language", ""))
    _register_unicode_font(report_language)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=12*mm,  bottomMargin=16*mm,
        title="ClariMed Health Report",
        author="ClariMed",
    )

    S = _styles()
    story = []
    date_str  = report_date or datetime.now().strftime("%d %B %Y")
    gender_w  = "Male" if patient_gender == "M" else "Female"
    tests     = analysis.get("tests", [])
    patterns  = analysis.get("patterns", [])
    score     = analysis.get("health_score", 0)
    grade     = analysis.get("health_grade", "—")
    summary   = analysis.get("health_summary", "")
    doctors_narrative = analysis.get("doctors_narrative", summary)
    path_to_normal = analysis.get("path_to_normal", {})
    curated_resources = analysis.get("curated_resources", {})
    score_sum = analysis.get("score_summary", "")
    dq        = analysis.get("doctor_questions", [])
    breakdown = analysis.get("score_breakdown", {})

    abnormal  = [t for t in tests if t.get("status") != "normal"]
    normal    = [t for t in tests if t.get("status") == "normal"]
    critical  = [t for t in tests if t.get("status") in ("critical_low", "critical_high")]

    grade_color = _grade_color(grade)

    # ── HEADER BANNER ─────────────────────────────────────────
    header_data = [[
        Paragraph("🩺 ClariMed", S["title"]),
    ]]
    header_table = Table(header_data, colWidths=[W - 36*mm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), C_NAVY),
        ("TOPPADDING",    (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("ROUNDEDCORNERS", [6,6,6,6]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4))

    sub_data = [[
        Paragraph("Comprehensive Health Analysis Report", S["subtitle"]),
    ]]
    sub_table = Table(sub_data, colWidths=[W - 36*mm])
    sub_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#1E3A5F")),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(sub_table)
    story.append(Spacer(1, 8))

    # ── PATIENT INFO BAR ──────────────────────────────────────
    pi_data = [[
        Paragraph(f"<b>Patient:</b> {patient_name}", S["body"]),
        Paragraph(f"<b>Age / Gender:</b> {patient_age} yrs / {gender_w}", S["body"]),
        Paragraph(f"<b>Report Date:</b> {date_str}", S["body"]),
        Paragraph(f"<b>Generated by:</b> ClariMed", S["body"]),
    ]]
    pi_table = Table(pi_data, colWidths=[(W-36*mm)/4]*4)
    pi_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C_LIGHT_BLUE),
        ("TOPPADDING",    (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
        ("LINEBELOW",     (0,0), (-1,-1), 0.5, C_BORDER),
    ]))
    story.append(pi_table)
    story.append(Spacer(1, 10))

    # ── HEALTH SCORE SECTION ──────────────────────────────────
    story.append(Paragraph("Overall Health Score", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))

    dial = _score_dial_drawing(score, grade, grade_color)

    # Stats summary alongside the dial
    c_count   = len(critical)
    ab_count  = len(abnormal)
    nm_count  = len(normal)
    pt_count  = len(patterns)

    stat_rows = [
        ["🔴 Critical",  str(c_count)],
        ["🟠 Abnormal",  str(ab_count)],
        ["🟢 Normal",    str(nm_count)],
        ["🔍 Patterns",  str(pt_count)],
        ["📋 Total Tests", str(len(tests))],
    ]
    stat_table = Table(stat_rows, colWidths=[65, 30])
    stat_table.setStyle(TableStyle([
        ("FONTNAME",  (0,0), (0,-1), "Helvetica"),
        ("FONTNAME",  (1,0), (1,-1), "Helvetica-Bold"),
        ("FONTSIZE",  (0,0), (-1,-1), 9),
        ("TEXTCOLOR", (0,0), (-1,-1), colors.HexColor("#374151")),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("ALIGN", (1,0), (1,-1), "CENTER"),
    ]))

    # Category breakdown
    breakdown_rows = [["Category", "Score", "Status"]]
    for cat, sc in sorted(breakdown.items(), key=lambda x: x[1]):
        if sc >= 80:   st, stc = "Good",     C_GREEN
        elif sc >= 60: st, stc = "Fair",     C_AMBER
        else:          st, stc = "Concern",  C_RED
        breakdown_rows.append([cat, str(sc) + "/100", st])

    if len(breakdown_rows) > 1:
        bk_table = Table(breakdown_rows, colWidths=[80, 50, 50])
        bk_style = [
            ("BACKGROUND",    (0,0), (-1,0), C_NAVY),
            ("TEXTCOLOR",     (0,0), (-1,0), C_WHITE),
            ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,-1), 8),
            ("TOPPADDING",    (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("GRID",          (0,0), (-1,-1), 0.4, C_BORDER),
            ("ALIGN",         (1,0), (2,-1), "CENTER"),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_WHITE, C_GREY_BG]),
        ]
        for i, row in enumerate(breakdown_rows[1:], 1):
            sc_val = int(row[1].replace("/100",""))
            c = C_GREEN if sc_val >= 80 else (C_AMBER if sc_val >= 60 else C_RED)
            bk_style.append(("TEXTCOLOR", (2,i), (2,i), c))
            bk_style.append(("FONTNAME",  (2,i), (2,i), "Helvetica-Bold"))
        bk_table.setStyle(TableStyle(bk_style))
    else:
        bk_table = Paragraph("No category breakdown available.", S["small"])

    score_layout = Table(
        [[dial, stat_table, bk_table]],
        colWidths=[115, 120, 288] # Total 523 (A4 width without margins)
    )
    score_layout.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ]))
    story.append(score_layout)
    story.append(Spacer(1, 10))

    # ── DOCTOR'S NARRATIVE ────────────────────────────────────
    story.append(Paragraph("Doctor's Narrative — Causal Analysis", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
    sum_table = Table([[Paragraph(doctors_narrative, S["body"])]], colWidths=[W - 36*mm])
    sum_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C_LIGHT_BLUE),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ("RIGHTPADDING",  (0,0), (-1,-1), 12),
        ("BOX",           (0,0), (-1,-1), 0.8, C_BLUE),
    ]))
    story.append(sum_table)
    story.append(Spacer(1, 12))

    # ── CRITICAL / ABNORMAL ALERTS ────────────────────────────
    if critical:
        story.append(Paragraph("⚠ Critical Values — Immediate Attention Required", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_RED, spaceAfter=6))
        for t in critical:
            tc, bc = _status_colors(t.get("status", "normal"))
            alert_content = [
                Paragraph(f"<b>{t.get('test_name','')}</b>", S["cell_bold"]),
                Paragraph(
                    f"Your value: <b>{t.get('value','')} {t.get('unit','')}</b> &nbsp;|&nbsp; "
                    f"Normal range: {t.get('reference_range','—')} &nbsp;|&nbsp; "
                    f"Deviation: {t.get('deviation_pct',0):.1f}% outside range",
                    S["cell"]
                ),
                Paragraph(t.get("explanation", ""), S["cell"]),
            ]
            alert_table = Table([[content] for content in alert_content],
                                colWidths=[W - 36*mm])
            alert_table.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,-1), C_RED_BG),
                ("LEFTPADDING",   (0,0), (-1,-1), 10),
                ("RIGHTPADDING",  (0,0), (-1,-1), 10),
                ("TOPPADDING",    (0,0), (-1,-1), 4),
                ("BOTTOMPADDING", (0,-1), (-1,-1), 8),
                ("BOX",           (0,0), (-1,-1), 1.0, C_RED),
                ("LINEBELOW",     (0,0), (0,0), 0.5, colors.HexColor("#FECACA")),
            ]))
            story.append(KeepTogether([alert_table, Spacer(1, 5)]))
        story.append(Spacer(1, 4))

    # ── DETAILED RESULTS TABLE ────────────────────────────────
    story.append(Paragraph("Detailed Test Results", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))

    # Legend
    legend_items = [
        ("✓ Normal", C_GREEN, C_GREEN_BG),
        ("↑↓ Mild/Moderate", C_AMBER, C_AMBER_BG),
        ("↑↑↓↓ Critical", C_RED, C_RED_BG),
    ]
    legend_cells = []
    for label, tc, bc in legend_items:
        p = Paragraph(label, ParagraphStyle("leg", fontSize=7.5, textColor=tc,
                       fontName="Helvetica-Bold", alignment=TA_CENTER))
        legend_cells.append(p)
    legend_table = Table([legend_cells], colWidths=[80, 100, 80])
    legend_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (0,0), C_GREEN_BG),
        ("BACKGROUND",    (1,0), (1,0), C_AMBER_BG),
        ("BACKGROUND",    (2,0), (2,0), C_RED_BG),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("BOX",           (0,0), (0,0), 0.5, C_GREEN),
        ("BOX",           (1,0), (1,0), 0.5, C_AMBER),
        ("BOX",           (2,0), (2,0), 0.5, C_RED),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ]))
    story.append(legend_table)
    story.append(Spacer(1, 5))

    # Table header
    col_w = [110, 60, 80, 50, 70, 120]  # total = 490
    headers = ["Parameter", "Your Result", "Normal Range", "Deviation", "Urgency", "Visual Gauge"]
    hdr_row = [Paragraph(f"<b>{h}</b>", ParagraphStyle(
                    "th", fontSize=8, textColor=C_WHITE,
                    fontName="Helvetica-Bold", alignment=TA_CENTER)) for h in headers]

    table_data = [hdr_row]
    row_styles = [
        ("BACKGROUND",    (0,0), (-1,0), C_NAVY),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_WHITE, C_GREY_BG]),
        ("GRID",          (0,0), (-1,-1), 0.35, C_BORDER),
        ("FONTSIZE",      (0,0), (-1,-1), 8),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING",   (0,0), (-1,-1), 5),
        ("RIGHTPADDING",  (0,0), (-1,-1), 5),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]

    # Sort: critical first, then high/low, then normal
    def sort_key(t):
        order = {"critical_low":0,"critical_high":0,"low":1,"high":1,"normal":2}
        return order.get(t.get("status","normal"), 2)

    sorted_tests = sorted(tests, key=sort_key)

    for row_idx, t in enumerate(sorted_tests, 1):
        status   = t.get("status", "normal")
        tc, bc   = _status_colors(status)
        dev      = t.get("deviation_pct", 0)
        dev_str  = f"{dev:.1f}%" if dev > 0 else "—"
        label    = STATUS_LABEL.get(status, status).upper()
        gauge_pos = t.get("gauge_position", 0.5)

        val_style = S["cell_right_bold"] if status != "normal" else S["cell_right"]

        row = [
            Paragraph(f"<b>{t.get('test_name','')}</b>", S["cell_bold"]),
            Paragraph(f"{t.get('value','')} {t.get('unit','')}", val_style),
            Paragraph(t.get("reference_range", "—"), S["cell_right"]),
            Paragraph(dev_str, val_style),
            Paragraph(label, ParagraphStyle("st", fontSize=8, textColor=tc,
                           fontName="Helvetica-Bold", alignment=TA_CENTER)),
            _bar_gauge_drawing(gauge_pos, status),
        ]
        table_data.append(row)

        # Colour abnormal rows
        if status != "normal":
            row_styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), bc))
            row_styles.append(("TEXTCOLOR",  (0, row_idx), (-1, row_idx), tc))

    results_table = Table(table_data, colWidths=col_w, repeatRows=1)
    results_table.setStyle(TableStyle(row_styles))
    story.append(results_table)
    story.append(Spacer(1, 14))

    # ── WHAT TO DO — ABNORMAL VALUES GUIDE ───────────────────
    if abnormal:
        story.append(PageBreak())
        story.append(Paragraph("Action Guide — What Each Abnormal Value Means & What To Do", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=8))

        for t in abnormal:
            status = t.get("status", "normal")
            tc, bc = _status_colors(status)
            sev    = t.get("severity", "mild")
            sev_color = _severity_color(sev)
            dev    = t.get("deviation_pct", 0)

            action_guide = _action_guide(t)

            header_cells = [
                Paragraph(f"<b>{t.get('test_name','')}</b>", ParagraphStyle(
                    "ah", fontSize=10, textColor=C_NAVY, fontName="Helvetica-Bold")),
                Paragraph(
                    f"Your value: <b>{t.get('value','')} {t.get('unit','')}</b>",
                    ParagraphStyle("av", fontSize=9, textColor=tc, fontName="Helvetica-Bold",
                                   alignment=TA_RIGHT)),
            ]
            hdr = Table([header_cells], colWidths=[(W-36*mm)*0.65, (W-36*mm)*0.35])
            hdr.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,-1), bc),
                ("TOPPADDING",    (0,0), (-1,-1), 7),
                ("BOTTOMPADDING", (0,0), (-1,-1), 7),
                ("LEFTPADDING",   (0,0), (0,0),  10),
                ("RIGHTPADDING",  (-1,0),(-1,0), 10),
                ("LINEBELOW",     (0,0), (-1,-1), 0.5, tc),
            ]))

            detail_rows = [
                ["Normal Range",   t.get("reference_range", "—")],
                ["Your Value",     f"{t.get('value','')} {t.get('unit','')}"],
                ["How Far Off",    f"{dev:.1f}% outside normal" if dev > 0 else "Within range"],
                ["Severity",       sev.title()],
                ["Category",       t.get("category", "—")],
            ]
            detail_table = Table(detail_rows, colWidths=[90, 200])
            detail_table.setStyle(TableStyle([
                ("FONTNAME",  (0,0), (0,-1), "Helvetica-Bold"),
                ("FONTNAME",  (1,0), (1,-1), "Helvetica"),
                ("FONTSIZE",  (0,0), (-1,-1), 8),
                ("TEXTCOLOR", (0,0), (0,-1), C_NAVY),
                ("TOPPADDING",    (0,0), (-1,-1), 3),
                ("BOTTOMPADDING", (0,0), (-1,-1), 3),
                ("LEFTPADDING",   (0,0), (-1,-1), 8),
                ("ROWBACKGROUNDS",(0,0), (-1,-1), [C_WHITE, C_GREY_BG]),
                ("GRID",          (0,0), (-1,-1), 0.3, C_BORDER),
                ("TEXTCOLOR",     (1,3), (1,3), sev_color),
                ("FONTNAME",      (1,3), (1,3), "Helvetica-Bold"),
            ]))

            what_to_do = Paragraph(
                f"<b>What this means:</b> {t.get('explanation','')}<br/><br/>"
                f"<b>What to do:</b> {action_guide}",
                ParagraphStyle("wtd", fontSize=8.5, textColor=colors.HexColor("#1F2937"),
                               fontName="Helvetica", leading=13,
                               leftIndent=4, rightIndent=4)
            )

            body_content = Table(
                [[detail_table, what_to_do]],
                colWidths=[300, W - 36*mm - 300]
            )
            body_content.setStyle(TableStyle([
                ("VALIGN",       (0,0), (-1,-1), "TOP"),
                ("TOPPADDING",   (0,0), (-1,-1), 8),
                ("LEFTPADDING",  (0,0), (-1,-1), 6),
                ("RIGHTPADDING", (0,0), (-1,-1), 6),
                ("BOTTOMPADDING",(0,0), (-1,-1), 8),
            ]))

            outer = Table([[hdr], [body_content]], colWidths=[W - 36*mm])
            outer.setStyle(TableStyle([
                ("BOX",           (0,0), (-1,-1), 0.8, tc),
                ("TOPPADDING",    (0,0), (-1,-1), 0),
                ("BOTTOMPADDING", (0,0), (-1,-1), 0),
                ("LEFTPADDING",   (0,0), (-1,-1), 0),
                ("RIGHTPADDING",  (0,0), (-1,-1), 0),
            ]))
            story.append(KeepTogether([outer, Spacer(1, 8)]))

    # ── CLINICAL PATTERNS ─────────────────────────────────────
    if patterns:
        story.append(Spacer(1, 4))
        story.append(Paragraph("Clinical Pattern Analysis", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
        story.append(Paragraph(
            "These patterns are detected when multiple related tests point to a common condition.",
            S["small"]))
        story.append(Spacer(1, 6))

        for p in patterns:
            urgency = p.get("urgency", "moderate")
            uc = {"high": C_RED, "moderate": C_AMBER, "low": C_GREEN}.get(urgency, C_AMBER)
            ub = {"high": C_RED_BG, "moderate": C_AMBER_BG, "low": C_GREEN_BG}.get(urgency, C_AMBER_BG)
            conf = int(p.get("confidence", 0) * 100)

            syms  = p.get("symptoms", [])
            dqs   = p.get("doctor_questions", [])
            diet  = p.get("dietary_note", "")
            icd   = p.get("icd10", "")

            sym_text  = " • ".join(syms) if syms else "See a doctor for full assessment."
            dq_text   = "<br/>".join(f"• {q}" for q in dqs[:4])
            mt_text   = ", ".join(p.get("matched_tests", []))

            pat_rows = [
                [
                    Paragraph(f"<b>{p.get('name','')}</b>", S["pattern_name"]),
                    Paragraph(f"Confidence: <b>{conf}%</b>", ParagraphStyle(
                        "conf", fontSize=8, textColor=uc, fontName="Helvetica-Bold",
                        alignment=TA_RIGHT)),
                ],
                [
                    Paragraph(f"Urgency: <b>{urgency.title()}</b> &nbsp;|&nbsp; "
                              f"ICD-10: {icd} &nbsp;|&nbsp; Triggered by: {mt_text}",
                              S["small"]),
                    Paragraph(f"Severity: <b>{p.get('severity','').title()}</b>",
                              ParagraphStyle("sev2", fontSize=8, textColor=uc,
                                            fontName="Helvetica-Bold", alignment=TA_RIGHT)),
                ],
            ]
            pat_hdr = Table(pat_rows, colWidths=[(W-36*mm)*0.7, (W-36*mm)*0.3])
            pat_hdr.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,-1), ub),
                ("TOPPADDING",    (0,0), (-1,-1), 5),
                ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                ("LEFTPADDING",   (0,0), (0,-1),  10),
                ("RIGHTPADDING",  (-1,0),(-1,-1), 10),
                ("LINEBELOW",     (0,-1), (-1,-1), 0.5, uc),
            ]))

            body_rows = [
                ["Explanation",     p.get("explanation", "")],
                ["Watch for",       sym_text],
                ["Ask your doctor", dq_text],
            ]
            if diet:
                body_rows.append(["Diet tip", diet])

            pat_body = Table(body_rows, colWidths=[90, W-36*mm-90])
            pat_body.setStyle(TableStyle([
                ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
                ("FONTSIZE",      (0,0), (-1,-1), 8),
                ("TEXTCOLOR",     (0,0), (0,-1), C_NAVY),
                ("TEXTCOLOR",     (1,0), (1,-1), colors.HexColor("#374151")),
                ("TOPPADDING",    (0,0), (-1,-1), 5),
                ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                ("LEFTPADDING",   (0,0), (-1,-1), 10),
                ("GRID",          (0,0), (-1,-1), 0.3, C_BORDER),
                ("ROWBACKGROUNDS",(0,0), (-1,-1), [C_WHITE, C_GREY_BG]),
                ("VALIGN",        (0,0), (-1,-1), "TOP"),
                ("SPAN",          (0,2), (0,2)),
            ]))

            pat_outer = Table([[pat_hdr], [pat_body]], colWidths=[W - 36*mm])
            pat_outer.setStyle(TableStyle([
                ("BOX",           (0,0), (-1,-1), 0.8, uc),
                ("TOPPADDING",    (0,0), (-1,-1), 0),
                ("BOTTOMPADDING", (0,0), (-1,-1), 0),
                ("LEFTPADDING",   (0,0), (-1,-1), 0),
                ("RIGHTPADDING",  (0,0), (-1,-1), 0),
            ]))
            story.append(KeepTogether([pat_outer, Spacer(1, 8)]))

    # ── RECOMMENDED SPECIALISTS ──────────────────────────────
    recom_specs = analysis.get("recommended_specialists", [])
    if recom_specs:
        story.append(Spacer(1, 14))
        story.append(Paragraph("Clinical Consultations — Recommended Specialists", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=8))
        story.append(Paragraph(
            "Based on your results, consulting with these specialists is recommended to further investigate specific markers.",
            S["small"]))
        story.append(Spacer(1, 8))

        spec_cards = []
        for spec in recom_specs:
            name   = spec.get("specialty", "General Physician")
            emoji  = spec.get("emoji", "🩺")
            reason = spec.get("reason", "")
            query  = spec.get("maps_query", f"{name} near me")
            maps_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"

            card_content = [
                Paragraph(f"{emoji} {name}", S["specialist_name"]),
                Paragraph(reason, S["spec_reason"]),
                Spacer(1, 4),
                Paragraph(f'<u><a href="{maps_url}" color="blue">Find Nearby {name} on Google Maps →</a></u>', S["link"]),
            ]
            
            card_table = Table([[c] for c in card_content], colWidths=[(W-36*mm)/2 - 12])
            card_table.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,-1), C_GREY_BG),
                ("BOX",           (0,0), (-1,-1), 0.5, C_BORDER),
                ("TOPPADDING",    (0,0), (-1,-1), 10),
                ("BOTTOMPADDING", (0,0), (-1,-1), 10),
                ("LEFTPADDING",   (0,0), (-1,-1), 10),
                ("RIGHTPADDING",  (0,0), (-1,-1), 10),
            ]))
            spec_cards.append(card_table)

        # Chunk cards into pairs
        card_rows = []
        for i in range(0, len(spec_cards), 2):
            row = spec_cards[i:i+2]
            if len(row) < 2: row.append(Spacer(1,1))
            card_rows.append(row)

        layout_table = Table(card_rows, colWidths=[(W-36*mm)/2]*2)
        layout_table.setStyle(TableStyle([
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("BOTTOMPADDING", (0,0), (-1,-1), 12),
        ]))
        story.append(layout_table)

    # ── DOCTOR QUESTIONS ─────────────────────────────────────
    if dq:
        story.append(Spacer(1, 4))
        story.append(Paragraph("Questions to Ask Your Doctor", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
        story.append(Paragraph(
            "Print this report and bring these specific questions to your next appointment.",
            S["small"]))
        story.append(Spacer(1, 5))

        dq_rows = [["#", "Question to Ask Your Doctor"]]
        for i, q in enumerate(dq, 1):
            dq_rows.append([str(i), q])

        dq_table = Table(dq_rows, colWidths=[20, W-36*mm-20])
        dq_table.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0), C_NAVY),
            ("TEXTCOLOR",     (0,0), (-1,0), C_WHITE),
            ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,-1), 9),
            ("TOPPADDING",    (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("LEFTPADDING",   (0,0), (-1,-1), 8),
            ("GRID",          (0,0), (-1,-1), 0.4, C_BORDER),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_LIGHT_BLUE, C_WHITE]),
            ("VALIGN",        (0,0), (-1,-1), "TOP"),
            ("ALIGN",         (0,0), (0,-1), "CENTER"),
            ("FONTNAME",      (0,1), (0,-1), "Helvetica-Bold"),
            ("TEXTCOLOR",     (0,1), (0,-1), C_NAVY),
        ]))
        story.append(dq_table)

    # ── CURATED RESOURCE LIBRARY ──────────────────────────────
    if curated_resources:
        story.append(PageBreak())
        story.append(Paragraph("Curated Resource Library", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
        story.append(Paragraph(
            "These links are AI-curated based on YOUR specific findings from reputable sources.",
            S["small"]))
        story.append(Spacer(1, 8))
        
        yt = curated_resources.get("youtube", [])
        articles = curated_resources.get("articles", [])
        
        res_rows = [["Type", "Recommended Resource"]]
        for vid in yt:
            vurl = vid.get('url', '')
            res_rows.append([
                Paragraph("<b>Video</b>", S["cell"]),
                Paragraph(f"{vid.get('title','')} - <link href=\"{vurl}\" color=\"#1A56DB\">Watch Here</link>", S["link"])
            ])
        for art in articles:
            aurl = art.get('url', '')
            res_rows.append([
                Paragraph("<b>Article</b>", S["cell"]),
                Paragraph(f"{art.get('title','')} - <link href=\"{aurl}\" color=\"#1A56DB\">Read Here</link>", S["link"])
            ])

        if len(res_rows) > 1:
            res_table = Table(res_rows, colWidths=[60, W-36*mm-60])
            res_table.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,0), C_NAVY),
                ("TEXTCOLOR",     (0,0), (-1,0), C_WHITE),
                ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",      (0,0), (-1,-1), 9),
                ("TOPPADDING",    (0,0), (-1,-1), 6),
                ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                ("LEFTPADDING",   (0,0), (-1,-1), 8),
                ("GRID",          (0,0), (-1,-1), 0.4, C_BORDER),
                ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_WHITE, C_GREY_BG]),
                ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ]))
            story.append(res_table)

    # ── PATH TO NORMAL ─────────────────────────────────────────
    if path_to_normal:
        story.append(Spacer(1, 14))
        story.append(Paragraph("Path to Normal — Action Plan", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
        
        diet_swaps = path_to_normal.get("dietary_swaps", [])
        activity = path_to_normal.get("activity_prescription", "")

        sub_rows = []
        if diet_swaps:
            sub_rows.append([Paragraph("<b>Specific Dietary Swaps</b>", S["body_bold"])])
            for swap in diet_swaps:
                sub_rows.append([Paragraph(f"• {swap}", S["body"])])
        
        if activity:
            sub_rows.append([Spacer(1, 4)])
            sub_rows.append([Paragraph("<b>Activity Prescription</b>", S["body_bold"])])
            sub_rows.append([Paragraph(activity, S["body"])])

        if sub_rows:
            path_table = Table(sub_rows, colWidths=[W - 36*mm])
            path_table.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,-1), C_LIGHT_BLUE),
                ("TOPPADDING",    (0,0), (-1,-1), 8),
                ("BOTTOMPADDING", (0,0), (-1,-1), 8),
                ("LEFTPADDING",   (0,0), (-1,-1), 12),
                ("BOX",           (0,0), (-1,-1), 0.5, C_BLUE),
            ]))
            story.append(path_table)

    # ── NORMAL VALUES REFERENCE TABLE ─────────────────────────
    if normal:
        story.append(Spacer(1, 14))
        story.append(Paragraph("Your Normal Results — Keep It Up!", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_GREEN, spaceAfter=6))

        norm_rows = [["Test", "Your Value", "Normal Range", "Category", "Notes"]]
        for t in normal:
            norm_rows.append([
                t.get("test_name", ""),
                f"{t.get('value','')} {t.get('unit','')}",
                t.get("reference_range", "—"),
                t.get("category", "—"),
                "✓ Keep maintaining your current lifestyle.",
            ])

        norm_table = Table(norm_rows, colWidths=[110, 70, 90, 70, 175])
        norm_table.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0), C_GREEN),
            ("TEXTCOLOR",     (0,0), (-1,0), C_WHITE),
            ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,-1), 8),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("GRID",          (0,0), (-1,-1), 0.4, C_BORDER),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_GREEN_BG, C_WHITE]),
            ("ALIGN",         (1,0), (3,-1), "CENTER"),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ]))
        story.append(norm_table)

    # ── DISCLAIMER ────────────────────────────────────────────
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
    story.append(Paragraph(
        "DISCLAIMER: This report is generated by ClariMed for educational purposes only. "
        "It does not constitute a final diagnosis, medical advice, or treatment. "
        "Always consult a qualified healthcare professional before making any health decisions.",
        S["disclaimer"]
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"Generated by ClariMed  •  {date_str}  •  For personal use only",
        S["disclaimer"]
    ))

    _apply_unicode_font_overrides(story)
    doc.build(story)
    return buf.getvalue()

    # ── CURATED RESOURCE LIBRARY ──────────────────────────────
    if curated_resources:
        story.append(PageBreak())
        story.append(Paragraph("Curated Resource Library", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
        story.append(Paragraph(
            "These links are AI-curated based on YOUR specific findings from reputable sources.",
            S["small"]))
        story.append(Spacer(1, 8))
        
        yt = curated_resources.get("youtube", [])
        articles = curated_resources.get("articles", [])
        
        res_rows = [["Type", "Recommended Resource"]]
        for vid in yt:
            vurl = vid.get('url', '')
            res_rows.append([
                Paragraph("<b>Video</b>", S["cell"]),
                Paragraph(f"{vid.get('title','')} - <link href=\"{vurl}\" color=\"#1A56DB\">Watch Here</link>", S["link"])
            ])
        for art in articles:
            aurl = art.get('url', '')
            res_rows.append([
                Paragraph("<b>Article</b>", S["cell"]),
                Paragraph(f"{art.get('title','')} - <link href=\"{aurl}\" color=\"#1A56DB\">Read Here</link>", S["link"])
            ])

        if len(res_rows) > 1:
            res_table = Table(res_rows, colWidths=[60, W-36*mm-60])
            res_table.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,0), C_NAVY),
                ("TEXTCOLOR",     (0,0), (-1,0), C_WHITE),
                ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",      (0,0), (-1,-1), 9),
                ("TOPPADDING",    (0,0), (-1,-1), 6),
                ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                ("LEFTPADDING",   (0,0), (-1,-1), 8),
                ("GRID",          (0,0), (-1,-1), 0.4, C_BORDER),
                ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_WHITE, C_GREY_BG]),
                ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ]))
            story.append(res_table)

    # ── PATH TO NORMAL ─────────────────────────────────────────
    if path_to_normal:
        story.append(Spacer(1, 14))
        story.append(Paragraph("Path to Normal — Action Plan", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
        
        diet_swaps = path_to_normal.get("dietary_swaps", [])
        activity = path_to_normal.get("activity_prescription", "")

        sub_rows = []
        if diet_swaps:
            sub_rows.append([Paragraph("<b>Specific Dietary Swaps</b>", S["body_bold"])])
            for swap in diet_swaps:
                sub_rows.append([Paragraph(f"• {swap}", S["body"])])
        
        if activity:
            sub_rows.append([Spacer(1, 4)])
            sub_rows.append([Paragraph("<b>Activity Prescription</b>", S["body_bold"])])
            sub_rows.append([Paragraph(activity, S["body"])])

        if sub_rows:
            path_table = Table(sub_rows, colWidths=[W - 36*mm])
            path_table.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,-1), C_LIGHT_BLUE),
                ("TOPPADDING",    (0,0), (-1,-1), 8),
                ("BOTTOMPADDING", (0,0), (-1,-1), 8),
                ("LEFTPADDING",   (0,0), (-1,-1), 12),
                ("BOX",           (0,0), (-1,-1), 0.5, C_BLUE),
            ]))
            story.append(path_table)

    # ── NORMAL VALUES REFERENCE TABLE ─────────────────────────
    if normal:
        story.append(Spacer(1, 14))
        story.append(Paragraph("Your Normal Results — Keep It Up!", S["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_GREEN, spaceAfter=6))

        norm_rows = [["Test", "Your Value", "Normal Range", "Category", "Notes"]]
        for t in normal:
            norm_rows.append([
                t.get("test_name", ""),
                f"{t.get('value','')} {t.get('unit','')}",
                t.get("reference_range", "—"),
                t.get("category", "—"),
                "✓ Keep maintaining your current lifestyle.",
            ])

        norm_table = Table(norm_rows, colWidths=[110, 70, 90, 70, 175])
        norm_table.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0), C_GREEN),
            ("TEXTCOLOR",     (0,0), (-1,0), C_WHITE),
            ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,-1), 8),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("GRID",          (0,0), (-1,-1), 0.4, C_BORDER),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_GREEN_BG, C_WHITE]),
            ("ALIGN",         (1,0), (3,-1), "CENTER"),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ]))
        story.append(norm_table)

    # ── DISCLAIMER ────────────────────────────────────────────
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6))
    story.append(Paragraph(
        "DISCLAIMER: This report is generated by ClariMed for educational purposes only. "
        "It does not constitute a final diagnosis, medical advice, or treatment. "
        "Always consult a qualified healthcare professional before making any health decisions.",
        S["disclaimer"]
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"Generated by ClariMed  •  {date_str}  •  For personal use only",
        S["disclaimer"]
    ))

    doc.build(story)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────
# Action guide generator
# ─────────────────────────────────────────────────────────────

def _action_guide(test: dict) -> str:
    """Return a practical action guide for an abnormal test."""
    name   = (test.get("test_name") or "").lower()
    status = test.get("status", "")
    sev    = test.get("severity", "mild")

    urgency_prefix = {
        "critical": "⚠ URGENT: See a doctor as soon as possible. ",
        "moderate": "📅 See your doctor within the next 2–4 weeks. ",
        "mild":     "📋 Discuss at your next routine appointment. ",
        "normal":   "",
    }.get(sev, "")

    guides = {
        "hemoglobin": {
            "low": urgency_prefix + "Low hemoglobin indicates anemia. Eat iron-rich foods (spinach, lentils, red meat). Avoid tea/coffee with meals as they block iron absorption. Take iron supplements only if prescribed.",
            "high": urgency_prefix + "High hemoglobin may indicate dehydration or a blood disorder. Increase fluid intake. Your doctor may order further tests.",
        },
        "wbc": {
            "high": urgency_prefix + "Elevated white cells usually indicate infection or inflammation. Avoid self-medicating antibiotics. See your doctor for further evaluation.",
            "low":  urgency_prefix + "Low white cells reduce infection-fighting ability. Avoid sick contacts. Report any fever immediately to your doctor.",
        },
        "glucose": {
            "high": urgency_prefix + "High blood sugar can damage organs over time. Reduce sugary foods, refined carbs, and sweetened drinks. Exercise for at least 30 minutes daily. Track readings at home if possible.",
            "low":  urgency_prefix + "Low blood sugar needs immediate correction. Eat 15g fast sugar (glucose tablet, juice) now. If recurring, see your doctor.",
        },
        "hba1c": {
            "high": urgency_prefix + "Elevated HbA1c shows prolonged high blood sugar. Reduce processed carbohydrates. Increase vegetables, fibre, and physical activity. Medication may be required.",
        },
        "cholesterol": {
            "high": urgency_prefix + "High cholesterol raises heart disease risk. Reduce saturated fats (fried food, red meat, full-fat dairy). Increase fibre (oats, fruits, vegetables). Exercise 150 min/week.",
        },
        "ldl": {
            "high": urgency_prefix + "High LDL (bad cholesterol) clogs arteries. Eliminate trans fats and reduce saturated fats. Eat more soluble fibre and omega-3 rich fish. Statins may be considered by your doctor.",
        },
        "hdl": {
            "low": urgency_prefix + "Low HDL (good cholesterol) increases heart risk. Exercise regularly — it's the best way to raise HDL. Stop smoking if applicable. Eat healthy fats (avocado, nuts, olive oil).",
        },
        "triglyceride": {
            "high": urgency_prefix + "High triglycerides are linked to heart disease. Cut alcohol, refined sugar, and white carbs. Eat more omega-3 fish. Exercise regularly.",
        },
        "tsh": {
            "high": urgency_prefix + "High TSH suggests an underactive thyroid. Symptoms include fatigue, weight gain, and cold sensitivity. Medication (levothyroxine) is often required. See an endocrinologist.",
            "low":  urgency_prefix + "Low TSH suggests an overactive thyroid. Symptoms include weight loss, rapid heartbeat, anxiety. See an endocrinologist promptly.",
        },
        "creatinine": {
            "high": urgency_prefix + "High creatinine may indicate kidney stress. Stay well-hydrated. Avoid NSAIDs (ibuprofen, diclofenac). Reduce protein intake if advised. Follow up with kidney function tests.",
        },
        "vitamin d": {
            "low": urgency_prefix + "Vitamin D deficiency is very common. Get 15-20 min daily sunlight. Take prescribed supplements (usually 1000-2000 IU/day or higher if critically low). Eat fortified foods and fatty fish.",
        },
        "vitamin b12": {
            "low": urgency_prefix + "Low B12 affects nerves and red blood cells. Eat meat, fish, eggs, and dairy. Vegetarians/vegans need B12 supplements. Injections may be needed for severe deficiency.",
        },
        "ferritin": {
            "low": urgency_prefix + "Low ferritin confirms iron deficiency. Take iron supplements as prescribed. Eat iron-rich foods with Vitamin C (lemon juice helps absorption). Avoid tea with meals.",
        },
        "sgpt": {
            "high": urgency_prefix + "Elevated liver enzyme. Avoid alcohol completely. Stop any unnecessary medications/supplements. Avoid fatty and fried food. Ultrasound of abdomen may be needed.",
        },
        "sgot": {
            "high": urgency_prefix + "Elevated liver/heart enzyme. Avoid alcohol. May indicate liver inflammation, heart stress, or muscle damage. Further tests needed.",
        },
        "uric acid": {
            "high": urgency_prefix + "High uric acid can cause gout and kidney stones. Reduce red meat, seafood, alcohol (especially beer), and fructose. Drink 2-3 litres of water daily.",
        },
    }

    # Match by keyword
    for key, directions in guides.items():
        if key in name:
            direction = "low" if "low" in status else "high"
            if direction in directions:
                return directions[direction]
            elif list(directions.values()):
                return list(directions.values())[0]

    # Generic fallback
    direction = "below" if "low" in status else "above"
    return (urgency_prefix +
            f"This value is {direction} the normal range. "
            "Discuss the cause and appropriate treatment with your doctor. "
            "Maintain a healthy diet, exercise regularly, and retest after 4-8 weeks.")


# ─────────────────────────────────────────────────────────────
# Convenience: write to file
# ─────────────────────────────────────────────────────────────

def generate_pdf_file(
    analysis: dict,
    output_path: str,
    patient_name: str = "Patient",
    patient_age: int  = 0,
    patient_gender: str = "M",
) -> str:
    """Generate PDF and save to file. Returns the path."""
    pdf_bytes = generate_pdf(analysis, patient_name, patient_age, patient_gender)
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
    return output_path