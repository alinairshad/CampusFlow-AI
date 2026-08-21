"""
Admin document management router — /admin/documents.

All routes require role: "admin".
"""
import logging
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.deps import CurrentUser, require_role
from app.db.mongo import get_database
from app.models.document import (
    DocumentCategory,
    DocumentListItem,
    DocumentListResponse,
    DocumentUploadResponse,
)
from app.services.document_processor import ExtractionError, chunk_text, extract_text
from app.services.embeddings import generate_embeddings_batch
from app.services.vector_store import delete_chunks_by_document, insert_chunks

logger = logging.getLogger(__name__)
router = APIRouter()

# 10 MB in bytes — agreed in planning assumption D
MAX_FILE_BYTES = 10 * 1024 * 1024

# Derive a human-readable title from a filename
def _title_from_filename(filename: str) -> str:
    stem = Path(filename).stem            # strip extension
    return stem.replace("_", " ").replace("-", " ").strip().title()


# ---------------------------------------------------------------------------
# POST /admin/documents  — full upload pipeline
# ---------------------------------------------------------------------------

@router.post("/", status_code=201, response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    category: DocumentCategory = Form(...),
    title: str = Form(None),              # optional override; derived from filename if absent
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    Upload a PDF, DOCX, or TXT document into the knowledge base.

    Pipeline:
      1. Validate file size (≤ 10 MB) and extension
      2. Extract text
      3. Chunk text (600 words / 100-word overlap)
      4. Embed all chunks in one batched API call
      5. Insert document record (status: "processed")
      6. Insert all chunk records

    Returns DocumentUploadResponse with the number of chunks created.
    """
    db = get_database()
    now = datetime.now(timezone.utc)

    # ── 1. Read and size-check ────────────────────────────────────────────────
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File '{file.filename}' is {len(file_bytes) / 1_048_576:.1f} MB. "
                f"Maximum allowed size is 10 MB."
            ),
        )

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # ── 2. Extract text ───────────────────────────────────────────────────────
    try:
        text = extract_text(file_bytes, file.filename)
    except ValueError as exc:
        # Unsupported extension
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except ExtractionError as exc:
        # Empty / unreadable content — store a failed record (Task 2.8)
        doc_title = title or _title_from_filename(file.filename)
        failed_doc = {
            "university_id": settings.UNIVERSITY_ID,
            "title": doc_title,
            "category": category.value,
            "filename": file.filename,
            "uploaded_by": current_user.user_id,
            "uploaded_at": now,
            "status": "failed",
        }
        result = await db["documents"].insert_one(failed_doc)
        logger.warning("Document extraction failed for '%s': %s", file.filename, exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not extract text from '{file.filename}': {exc}",
        ) from exc

    # ── 3. Chunk ──────────────────────────────────────────────────────────────
    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document '{file.filename}' produced no text chunks after extraction.",
        )

    logger.info(
        "Extracted %d chunks from '%s' (%d chars)",
        len(chunks), file.filename, len(text),
    )

    # ── 4. Embed (one batched API call) ───────────────────────────────────────
    try:
        embeddings = await generate_embeddings_batch(chunks)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Embedding service authentication failed — check LLM_API_KEY.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Embedding service error: {exc}",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Embedding service unavailable: {exc}",
        ) from exc

    # ── 5. Insert document record ─────────────────────────────────────────────
    doc_title = title.strip() if title and title.strip() else _title_from_filename(file.filename)

    doc = {
        "university_id": settings.UNIVERSITY_ID,
        "title": doc_title,
        "category": category.value,
        "filename": file.filename,
        "uploaded_by": current_user.user_id,
        "uploaded_at": now,
        "status": "processed",
    }
    doc_result = await db["documents"].insert_one(doc)
    document_id = str(doc_result.inserted_id)

    # ── 6. Insert chunks ──────────────────────────────────────────────────────
    chunk_docs = [
        {
            "document_id": document_id,
            "university_id": settings.UNIVERSITY_ID,
            "category": category.value,
            "chunk_index": i,
            "chunk_text": chunk_text_item,
            "embedding": embedding,
            "created_at": now,
        }
        for i, (chunk_text_item, embedding) in enumerate(zip(chunks, embeddings))
    ]

    try:
        await insert_chunks(chunk_docs)
    except Exception as exc:
        # Chunk insertion failed — mark document as failed and surface the error
        await db["documents"].update_one(
            {"_id": doc_result.inserted_id},
            {"$set": {"status": "failed"}},
        )
        logger.error(
            "Chunk insert failed for document %s — marked as failed: %s",
            document_id, exc,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document was processed but chunk storage failed. Please retry.",
        ) from exc

    logger.info(
        "Document uploaded: id=%s  title=%r  category=%s  chunks=%d",
        document_id, doc_title, category.value, len(chunks),
    )

    return DocumentUploadResponse(
        id=document_id,
        title=doc_title,
        category=category,
        filename=file.filename,
        status="processed",
        chunks_created=len(chunks),
        uploaded_at=now,
    )


# ---------------------------------------------------------------------------
# GET /admin/documents
# ---------------------------------------------------------------------------

@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    List all documents uploaded for this university, sorted by most recent first.
    Embeddings are never included in the response.
    """
    db = get_database()

    cursor = db["documents"].find(
        {"university_id": settings.UNIVERSITY_ID},
        sort=[("uploaded_at", -1)],
    )
    docs = await cursor.to_list(length=500)

    items = [
        DocumentListItem(
            id=str(doc["_id"]),
            title=doc["title"],
            category=doc["category"],
            filename=doc["filename"],
            uploaded_by=doc["uploaded_by"],
            uploaded_at=doc["uploaded_at"],
            status=doc["status"],
        )
        for doc in docs
    ]

    logger.info(
        "Admin listed %d documents (university=%s)",
        len(items), settings.UNIVERSITY_ID,
    )
    return DocumentListResponse(documents=items, total=len(items))


# ---------------------------------------------------------------------------
# DELETE /admin/documents/{doc_id}
# ---------------------------------------------------------------------------

@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    Delete a document and cascade-delete all its chunks.

    Returns 204 No Content on success.
    Returns 404 if the document does not exist or belongs to a different university.
    """
    db = get_database()

    # Validate ObjectId format before hitting the DB
    try:
        oid = ObjectId(doc_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{doc_id}' not found.",
        )

    # Fetch first to confirm it belongs to this university
    doc = await db["documents"].find_one(
        {"_id": oid, "university_id": settings.UNIVERSITY_ID}
    )
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{doc_id}' not found.",
        )

    # Cascade-delete chunks first, then the document record
    deleted_chunks = await delete_chunks_by_document(doc_id)
    await db["documents"].delete_one({"_id": oid})

    logger.info(
        "Document deleted: id=%s  title=%r  chunks_removed=%d",
        doc_id, doc.get("title"), deleted_chunks,
    )
    # 204 — return nothing
