"""
PDF generation using ReportLab.
Renders a formal application letter to a downloadable PDF.
Implemented in Stage 5.

NOTE: ReportLab is the LOCKED choice per tasks.md — do not substitute WeasyPrint.
"""


def generate_application_pdf(
    application_type: str,
    body_text: str,
    student_name: str,
    student_department: str,
    student_batch: str,
) -> bytes:
    """
    Render the application as a PDF using ReportLab.
    Returns raw PDF bytes.
    """
    raise NotImplementedError("Implemented in Stage 5")
