"""
Application generator router — /applications.

POST /applications/generate        — generate or clarify (Tasks 5.4, 5.6)
GET  /applications                 — list student's applications (Task 5.7)
GET  /applications/{id}/pdf        — stream PDF download (Task 5.5)
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.deps import CurrentUser, get_current_user
from app.db.mongo import get_database
from app.services.application_generator import (
    APP_TYPE_LABELS,
    APP_TYPE_RECIPIENT,
    generate_application,
)
from app.services.pdf_generator import generate_application_pdf

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ApplicationGenerateRequest(BaseModel):
    application_type: str
    reason: Optional[str] = None
    conversation_id: Optional[str] = None


class ApplicationGeneratedResponse(BaseModel):
    """Returned with 201 when the application is ready."""
    id: str
    application_type: str
    body_text: str
    status: str = "generated"


class ApplicationClarificationResponse(BaseModel):
    """Returned with 202 when more information is needed before generation."""
    needs_clarification: bool = True
    clarifying_question: str


class ApplicationListItem(BaseModel):
    id: str
    application_type: str
    type_label: str
    status: str
    created_at: datetime
    preview: str           # first 100 chars of body_text


class ApplicationListResponse(BaseModel):
    applications: list[ApplicationListItem]
    total: int


# ---------------------------------------------------------------------------
# POST /applications/generate   — Tasks 5.4 + 5.6
# ---------------------------------------------------------------------------

@router.post(
    "/generate",
    status_code=201,
    # FastAPI doesn't support Union response_model cleanly for different status
    # codes in all versions — we return dict and let Pydantic validate downstream
)
async def generate_application_endpoint(
    body: ApplicationGenerateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generate a formal application or ask a clarifying question.

    Response shapes:
      201 Created:  ApplicationGeneratedResponse  — body_text ready for preview
      202 Accepted: ApplicationClarificationResponse — needs_clarification=True
    """
    if body.application_type not in APP_TYPE_LABELS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unsupported application type '{body.application_type}'. "
                f"Supported: {', '.join(APP_TYPE_LABELS.keys())}"
            ),
        )

    try:
        result = await generate_application(
            application_type=body.application_type,
            user_id=current_user.user_id,
            university_id=current_user.university_id,
            reason=body.reason,
            conversation_id=body.conversation_id,
        )
    except Exception as exc:
        logger.error(
            "Application generation error: student=%s type=%r: %s",
            current_user.user_id, body.application_type, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating your application. Please try again.",
        ) from exc

    # ── Clarification needed → 202 ────────────────────────────────────────────
    if "clarifying_question" in result:
        return Response(
            content=ApplicationClarificationResponse(
                clarifying_question=result["clarifying_question"]
            ).model_dump_json(),
            status_code=status.HTTP_202_ACCEPTED,
            media_type="application/json",
        )

    # ── Application ready → persist + 201 ────────────────────────────────────
    db = get_database()
    now = datetime.now(timezone.utc)

    app_doc = {
        "university_id": current_user.university_id,
        "student_id": current_user.user_id,
        "type": result["application_type"],
        "content": result["body_text"],
        "status": "generated",
        "source_conversation_id": body.conversation_id,
        "created_at": now,
    }

    insert_result = await db["applications"].insert_one(app_doc)
    app_id = str(insert_result.inserted_id)

    logger.info(
        "Application saved: id=%s  type=%r  student=%s",
        app_id, result["application_type"], current_user.user_id,
    )

    return ApplicationGeneratedResponse(
        id=app_id,
        application_type=result["application_type"],
        body_text=result["body_text"],
        status="generated",
    )


# ---------------------------------------------------------------------------
# GET /applications   — Task 5.7
# ---------------------------------------------------------------------------

@router.get("/", response_model=ApplicationListResponse)
async def list_applications(
    current_user: CurrentUser = Depends(get_current_user),
):
    """List the authenticated student's applications, newest first."""
    db = get_database()

    cursor = db["applications"].find(
        {
            "student_id": current_user.user_id,
            "university_id": current_user.university_id,
        },
        sort=[("created_at", -1)],
        limit=50,
    )
    docs = await cursor.to_list(length=50)

    items = [
        ApplicationListItem(
            id=str(doc["_id"]),
            application_type=doc["type"],
            type_label=APP_TYPE_LABELS.get(doc["type"], doc["type"]),
            status=doc["status"],
            created_at=doc["created_at"],
            preview=doc["content"][:100],
        )
        for doc in docs
    ]

    return ApplicationListResponse(applications=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /applications/{app_id}/pdf   — Task 5.5
# ---------------------------------------------------------------------------

@router.get("/{app_id}/pdf")
async def download_pdf(
    app_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Render the application as a PDF and stream it as a download.
    404 if the application doesn't exist or belongs to another student.
    """
    db = get_database()

    try:
        oid = ObjectId(app_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Application not found.")

    doc = await db["applications"].find_one(
        {
            "_id": oid,
            "student_id": current_user.user_id,
            "university_id": current_user.university_id,
        }
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Application not found.")

    # Fetch student profile for the signature block
    profile = await db["student_profiles"].find_one(
        {"user_id": current_user.user_id}
    ) or {}

    try:
        pdf_bytes = generate_application_pdf(
            application_type=doc["type"],
            body_text=doc["content"],
            student_name=profile.get("name", ""),
            student_department=profile.get("department", ""),
            student_semester=profile.get("semester", ""),
            student_batch=profile.get("batch", ""),
        )
    except Exception as exc:
        logger.error("PDF generation failed for app_id=%s: %s", app_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF generation failed. Please try again.",
        ) from exc

    # Mark as downloaded
    await db["applications"].update_one(
        {"_id": oid},
        {"$set": {"status": "downloaded"}},
    )

    safe_type = doc["type"].replace("_", "-")
    filename = f"application-{safe_type}-{app_id[:8]}.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )
