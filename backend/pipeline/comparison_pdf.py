"""
pipeline/comparison_pdf.py
Generates a professional PDF comparison report for two medical analyses.
"""

from __future__ import annotations
import io
from datetime import datetime
from typing import Optional, List, Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import Drawing, Rect, String

# ─────────────────────────────────────────────────────────────
# Brand colours
# ─────────────────────────────────────────────────────────────
C_NAVY       = colors.HexColor("#0B1F3A")
C_GREEN      = colors.HexColor("#047857")
C_GREEN_BG   = colors.HexColor("#D1FAE5")
C_AMBER      = colors.HexColor("#B45309")
C_AMBER_BG   = colors.HexColor("#FEF3C7")
C_RED        = colors.HexColor("#B91C1C")
C_GREY       = colors.HexColor("#6B7280")
C_GREY_BG    = colors.HexColor("#F9FAFB")
C_BORDER     = colors.HexColor("#E5E7EB")
C_WHITE      = colors.white
C_BRAND      = colors.HexColor("#1E4620")

W, H = A4

# ─────────────────────────────────────────────────────────────
# Styles
# ─────────────────────────────────────────────────────────────
def _get_styles():
    ss = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "CompTitle", parent=ss["Title"],
            fontSize=22, leading=28, textColor=C_NAVY,
            spaceAfter=6, alignment=TA_CENTER,
        ),
        "subtitle": ParagraphStyle(
            "CompSubtitle", parent=ss["Normal"],
            fontSize=11, leading=14, textColor=C_GREY,
            alignment=TA_CENTER, spaceAfter=20,
        ),
        "section": ParagraphStyle(
            "CompSection", parent=ss["Heading2"],
            fontSize=14, leading=18, textColor=C_NAVY,
            spaceBefore=18, spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "CompBody", parent=ss["Normal"],
            fontSize=10, leading=14, textColor=colors.HexColor("#374151"),
        ),
        "bullet": ParagraphStyle(
            "CompBullet", parent=ss["Normal"],
            fontSize=10, leading=14, textColor=colors.HexColor("#374151"),
            leftIndent=16, bulletIndent=0,
        ),
        "improved_header": ParagraphStyle(
            "ImprovedH", parent=ss["Heading3"],
            fontSize=12, leading=16, textColor=C_GREEN,
            spaceBefore=12, spaceAfter=4,
        ),
        "declined_header": ParagraphStyle(
            "DeclinedH", parent=ss["Heading3"],
            fontSize=12, leading=16, textColor=C_AMBER,
            spaceBefore=12, spaceAfter=4,
        ),
        "steps_header": ParagraphStyle(
            "StepsH", parent=ss["Heading3"],
            fontSize=12, leading=16, textColor=C_NAVY,
            spaceBefore=12, spaceAfter=4,
        ),
        "footer": ParagraphStyle(
            "CompFooter", parent=ss["Normal"],
            fontSize=7, leading=9, textColor=C_GREY,
            alignment=TA_CENTER,
        ),
    }
    return styles


class ScoreComparisonBar(Flowable):
    """Draws two scores side by side with labels."""
    def __init__(self, old_score, new_score, old_grade, new_grade, old_date, new_date, width=460):
        Flowable.__init__(self)
        self.old_score = old_score
        self.new_score = new_score
        self.old_grade = old_grade
        self.new_grade = new_grade
        self.old_date = old_date
        self.new_date = new_date
        self.width = width
        self.height = 90

    def draw(self):
        c = self.canv
        half = self.width / 2
        
        # Old score box
        c.setFillColor(C_GREY_BG)
        c.roundRect(10, 0, half - 20, self.height, 10, fill=1, stroke=0)
        c.setFillColor(C_GREY)
        c.setFont("Helvetica", 9)
        c.drawCentredString(half / 2, self.height - 18, f"OLDER REPORT • {self.old_date}")
        c.setFillColor(C_NAVY)
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(half / 2, self.height - 55, str(self.old_score))
        c.setFont("Helvetica", 10)
        c.setFillColor(C_GREY)
        c.drawCentredString(half / 2, self.height - 72, self.old_grade)
        
        # New score box
        c.setFillColor(C_GREEN_BG)
        c.roundRect(half + 10, 0, half - 20, self.height, 10, fill=1, stroke=0)
        c.setFillColor(C_GREEN)
        c.setFont("Helvetica", 9)
        c.drawCentredString(half + half / 2, self.height - 18, f"LATEST REPORT • {self.new_date}")
        c.setFillColor(C_BRAND)
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(half + half / 2, self.height - 55, str(self.new_score))
        c.setFont("Helvetica", 10)
        c.setFillColor(C_GREEN)
        c.drawCentredString(half + half / 2, self.height - 72, self.new_grade)


def generate_comparison_pdf(
    report1: dict,
    report2: dict,
    comparison: dict,
) -> bytes:
    """Generate a downloadable comparison PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=30*mm, rightMargin=30*mm,
        topMargin=25*mm, bottomMargin=20*mm,
    )
    styles = _get_styles()
    story: list = []

    # Header
    story.append(Paragraph("ClariMed", styles["subtitle"]))
    story.append(Paragraph("Health Trajectory Report", styles["title"]))
    
    # Sort by date
    d1 = report1.get("created_at", "")
    d2 = report2.get("created_at", "")
    if d1 and d2 and d1 > d2:
        older, newer = report2, report1
    else:
        older, newer = report1, report2

    old_date = _format_date(older.get("created_at", ""))
    new_date = _format_date(newer.get("created_at", ""))
    
    story.append(Paragraph(
        f"Comparing results from <b>{old_date}</b> to <b>{new_date}</b>",
        styles["subtitle"]
    ))
    story.append(Spacer(1, 10))

    # Score comparison
    story.append(ScoreComparisonBar(
        old_score=older.get("health_score", "?"),
        new_score=newer.get("health_score", "?"),
        old_grade=older.get("health_grade", ""),
        new_grade=newer.get("health_grade", ""),
        old_date=old_date,
        new_date=new_date,
    ))
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 10))

    # Improved
    improved = comparison.get("improved", [])
    if improved:
        story.append(Paragraph("📈 What Improved", styles["improved_header"]))
        for item in improved:
            clean = _clean_text(item)
            story.append(Paragraph(f"• {clean}", styles["bullet"]))
        story.append(Spacer(1, 8))

    # Declined
    declined = comparison.get("declined", [])
    if declined:
        story.append(Paragraph("⚠️ Areas to Monitor", styles["declined_header"]))
        for item in declined:
            clean = _clean_text(item)
            story.append(Paragraph(f"• {clean}", styles["bullet"]))
        story.append(Spacer(1, 8))

    # Test comparison table
    story.append(Paragraph("Biomarker Comparison", styles["section"]))
    story.append(Spacer(1, 4))
    
    old_tests = {t["test_name"]: t for t in older.get("tests", [])}
    new_tests = {t["test_name"]: t for t in newer.get("tests", [])}
    all_test_names = list(dict.fromkeys(list(old_tests.keys()) + list(new_tests.keys())))

    if all_test_names:
        table_data = [["Test", f"Older ({old_date})", f"Latest ({new_date})", "Change"]]
        for name in all_test_names[:15]:
            ot = old_tests.get(name)
            nt = new_tests.get(name)
            old_val = f"{ot['value']} {ot.get('unit','')}" if ot else "—"
            new_val = f"{nt['value']} {nt.get('unit','')}" if nt else "—"
            
            change = ""
            if ot and nt:
                try:
                    ov = float(ot["value"])
                    nv = float(nt["value"])
                    diff = nv - ov
                    pct = (diff / ov * 100) if ov != 0 else 0
                    arrow = "↑" if diff > 0 else "↓" if diff < 0 else "→"
                    change = f"{arrow} {abs(pct):.1f}%"
                except (ValueError, TypeError):
                    change = "—"
            
            table_data.append([name, old_val, new_val, change])

        col_widths = [140, 110, 110, 70]
        t = Table(table_data, colWidths=col_widths)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), C_NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), C_WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8.5),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#374151")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, C_BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_GREY_BG]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 16))

    # Next Steps
    next_steps = comparison.get("next_steps", [])
    if next_steps:
        story.append(Paragraph("Recommended Next Steps", styles["section"]))
        for i, step in enumerate(next_steps, 1):
            clean = _clean_text(step)
            story.append(Paragraph(f"<b>{i}.</b> {clean}", styles["bullet"]))
        story.append(Spacer(1, 12))

    # Disclaimer
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "This comparison report is generated by AI and is intended for educational purposes only. "
        "It does not constitute medical advice. Please consult your healthcare provider for medical decisions.",
        styles["footer"]
    ))
    story.append(Paragraph(
        f"Generated by ClariMed on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        styles["footer"]
    ))

    doc.build(story)
    return buf.getvalue()


def _format_date(dt_str: str) -> str:
    try:
        dt = datetime.fromisoformat(dt_str)
        return dt.strftime("%b %d, %Y")
    except:
        return dt_str or "Unknown"

def _clean_text(text: str) -> str:
    return text.replace("*", "").replace("<", "&lt;").replace(">", "&gt;").strip()
