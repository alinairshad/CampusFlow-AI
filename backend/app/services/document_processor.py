"""
Document text extraction and chunking.
Supports PDF (pdfplumber), DOCX (python-docx), and TXT.
Implemented in Stage 2.
"""


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract raw text from a PDF, DOCX, or TXT file."""
    raise NotImplementedError("Implemented in Stage 2")


def chunk_text(text: str, chunk_size: int = 700, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks of approximately chunk_size tokens."""
    raise NotImplementedError("Implemented in Stage 2")
