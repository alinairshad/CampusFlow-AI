"""
PDF generation using ReportLab — Stage 5, Task 5.3.

LOCKED: ReportLab is the required library per tasks.md. Do not substitute.

Renders a formal A4 application letter with:
  - Header: university title + "FORMAL APPLICATION"
  - Date: auto-generated
  - Recipient block: generic (derived from application_type, not hallucinated)
  - Subject line
  - Body paragraphs from body_text
  - Signature block: student name, department, semester, batch
"""
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services.application_generator import APP_TYPE_LABELS, APP_TYPE_RECIPIENT


# ---------------------------------------------------------------------------
# Style definitions
# ---------------------------------------------------------------------------

def _build_styles() -> dict:
    base = getSampleStyleSheet()

    return {
        "university": ParagraphStyle(
            "university",
            parent=base["Normal"],
            fontSize=14,
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "doc_title": ParagraphStyle(
            "doc_title",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica",
            alignment=TA_CENTER,
            textColor=colors.HexColor("#555555"),
            spaceAfter=14,
        ),
        "label": ParagraphStyle(
            "label",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica-Bold",
            alignment=TA_LEFT,
            spaceAfter=2,
        ),
        "normal": ParagraphStyle(
            "normal",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica",
            alignment=TA_LEFT,
            leading=15,
            spaceAfter=6,
        ),
        "subject": ParagraphStyle(
            "subject",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica-Bold",
            alignment=TA_LEFT,
            spaceBefore=8,
            spaceAfter=12,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica",
            alignment=TA_LEFT,
            leading=16,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "sig_label": ParagraphStyle(
            "sig_label",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica-Bold",
            alignment=TA_LEFT,
            spaceAfter=2,
        ),
        "sig_value": ParagraphStyle(
            "sig_value",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica",
            alignment=TA_LEFT,
            spaceAfter=3,
        ),
        "date_right": ParagraphStyle(
            "date_right",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica",
            alignment=TA_RIGHT,
            spaceAfter=16,
        ),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_application_pdf(
    application_type: str,
    body_text: str,
    student_name: str,
    student_department: str,
    student_semester: str,
    student_batch: str,
    university_name: str = "CampusFlow University",
) -> bytes:
    """
    Render a formal application letter as a PDF using ReportLab.

    Parameters
    ----------
    application_type    : one of the 7 supported types
    body_text           : generated letter body (paragraphs only, no salutation/closing)
    student_name        : pre-filled from student profile
    student_department  : pre-filled from student profile
    student_semester    : pre-filled from student profile
    student_batch       : pre-filled from student profile
    university_name     : defaults to "CampusFlow University"

    Returns
    -------
    Raw PDF bytes suitable for a StreamingResponse / file download.
    """
    buffer = io.BytesIO()
    styles = _build_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        title=APP_TYPE_LABELS.get(application_type, application_type),
        author=student_name,
    )

    story = []

    # ── Header ───────────────────────────────────────────────────────────────
    story.append(Paragraph(university_name, styles["university"]))
    story.append(Paragraph("FORMAL APPLICATION", styles["doc_title"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CCCCCC")))
    story.append(Spacer(1, 0.4 * cm))

    # ── Date (right-aligned) ──────────────────────────────────────────────────
    date_str = datetime.now().strftime("%d %B %Y")
    story.append(Paragraph(f"Date: {date_str}", styles["date_right"]))

    # ── Recipient block ───────────────────────────────────────────────────────
    recipient = APP_TYPE_RECIPIENT.get(
        application_type, "The Head of Department"
    )
    story.append(Paragraph("To,", styles["normal"]))
    story.append(Paragraph(recipient + ",", styles["normal"]))
    story.append(Paragraph(university_name + ".", styles["normal"]))
    story.append(Spacer(1, 0.3 * cm))

    # ── Subject line ──────────────────────────────────────────────────────────
    subject = APP_TYPE_LABELS.get(application_type, application_type)
    story.append(
        Paragraph(f"<b>Subject: {subject}</b>", styles["subject"])
    )

    # ── Salutation ────────────────────────────────────────────────────────────
    story.append(Paragraph("Dear Sir/Madam,", styles["body"]))
    story.append(Spacer(1, 0.2 * cm))

    # ── Body paragraphs ───────────────────────────────────────────────────────
    # Split on blank lines; each non-empty block becomes a separate paragraph
    paragraphs = [p.strip() for p in body_text.split("\n") if p.strip()]
    for para in paragraphs:
        story.append(Paragraph(para, styles["body"]))

    story.append(Spacer(1, 0.6 * cm))

    # ── Closing ───────────────────────────────────────────────────────────────
    story.append(Paragraph("Yours sincerely,", styles["body"]))
    story.append(Spacer(1, 0.8 * cm))   # space for handwritten signature

    # ── Signature block as a two-column table ─────────────────────────────────
    sig_data = [
        [Paragraph("<b>Name</b>", styles["sig_label"]),
         Paragraph(student_name or "___________________", styles["sig_value"])],
        [Paragraph("<b>Department</b>", styles["sig_label"]),
         Paragraph(student_department or "___________________", styles["sig_value"])],
        [Paragraph("<b>Semester</b>", styles["sig_label"]),
         Paragraph(student_semester or "___", styles["sig_value"])],
        [Paragraph("<b>Batch</b>", styles["sig_label"]),
         Paragraph(student_batch or "___________________", styles["sig_value"])],
        [Paragraph("<b>Date</b>", styles["sig_label"]),
         Paragraph("___________________", styles["sig_value"])],
    ]

    sig_table = Table(sig_data, colWidths=[3.5 * cm, 10 * cm])
    sig_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))

    story.append(sig_table)

    # ── Render ────────────────────────────────────────────────────────────────
    doc.build(story)
    return buffer.getvalue()
