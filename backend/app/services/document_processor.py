"""
Document text extraction and chunking.
Supports PDF (pdfplumber), DOCX (python-docx), and TXT.
"""
import io
import logging
from pathlib import Path

import pdfplumber
from docx import Document as DocxDocument

logger = logging.getLogger(__name__)

# Supported extensions (lowercase)
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class ExtractionError(Exception):
    """Raised when text extraction fails or yields no usable content."""


# ---------------------------------------------------------------------------
# Task 2.2 — Text extraction
# ---------------------------------------------------------------------------

def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Extract raw text from a PDF, DOCX, or TXT file.

    Parameters
    ----------
    file_bytes : raw file content
    filename   : original filename — used only to determine format

    Returns
    -------
    Non-empty string of extracted text.

    Raises
    ------
    ValueError       if the file extension is not supported
    ExtractionError  if extraction succeeds structurally but yields no text,
                     or if the underlying library raises an unexpected error
    """
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. "
            f"Accepted formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )

    try:
        if ext == ".pdf":
            text = _extract_pdf(file_bytes)
        elif ext == ".docx":
            text = _extract_docx(file_bytes)
        else:  # .txt
            text = _extract_txt(file_bytes)
    except (ValueError, ExtractionError):
        raise
    except Exception as exc:
        raise ExtractionError(
            f"Unexpected error reading '{filename}': {exc}"
        ) from exc

    text = text.strip()
    if not text:
        raise ExtractionError(
            f"No readable text found in '{filename}'. "
            "The file may be empty, image-only, or corrupted."
        )

    logger.info("Extracted %d characters from '%s'", len(text), filename)
    return text


def _extract_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF using pdfplumber."""
    pages: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text()
            if page_text:
                pages.append(page_text)
            else:
                logger.debug("PDF page %d yielded no text (may be image-only)", page_num)
    return "\n\n".join(pages)


def _extract_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file using python-docx."""
    doc = DocxDocument(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def _extract_txt(file_bytes: bytes) -> str:
    """Decode a plain-text file, trying UTF-8 then falling back to latin-1."""
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        logger.warning("UTF-8 decode failed — falling back to latin-1")
        return file_bytes.decode("latin-1")


# ---------------------------------------------------------------------------
# Task 2.3 — Chunking
# ---------------------------------------------------------------------------

def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> list[str]:
    """
    Split text into overlapping word-based chunks.

    Parameters
    ----------
    text       : extracted document text
    chunk_size : target number of words per chunk (default 600 ≈ 780 tokens)
    overlap    : number of words carried over from the previous chunk (default 100)

    Returns
    -------
    List of non-empty chunk strings, minimum 1 item even for very short docs.

    Design notes
    ------------
    - Word-based (not token-based) to avoid a tokenizer dependency.
    - 600 words ≈ 780 tokens at the ~1.3 tokens/word average, within the
      500–800 token target from design.md section 5.1.
    - Overlap preserves sentence context across chunk boundaries, improving
      retrieval recall for queries that straddle a boundary.
    - Words are split on whitespace; original whitespace is not preserved
      (chunks are rejoined with single spaces).
    """
    if not text or not text.strip():
        return []

    words = text.split()

    # Short document — return as a single chunk
    if len(words) <= chunk_size:
        return [" ".join(words)]

    if overlap >= chunk_size:
        raise ValueError(
            f"overlap ({overlap}) must be less than chunk_size ({chunk_size})."
        )

    chunks: list[str] = []
    step = chunk_size - overlap   # how many words to advance each iteration
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))

        # If this chunk already reaches or passes the end, we're done
        if end >= len(words):
            break

        start += step

    return chunks
