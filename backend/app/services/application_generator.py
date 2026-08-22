"""
AI Application Generator — Stage 5, Tasks 5.1 + 5.2.

Public API:
    generate_application(application_type, user_id, university_id,
                         reason, conversation_id)
    → {"application_type": str, "body_text": str}     (application ready)
    → {"clarifying_question": str}                    (more info needed)

Design decisions (confirmed in planning):
    - Student profile fetched from DB (name, dept, semester, batch) for pre-fill.
    - Last 4 conversation messages injected for context if conversation_id given.
    - Retrieval uses same search_similar infrastructure as Stages 3/4.
    - No hard threshold gate: if no KB chunks found, still generate but use
      [to be confirmed] placeholders instead of inventing facts (assumption C).
    - Clarifying-question check is rule-based, not an extra LLM call (assumption D).
    - Same parse → retry → fallback pattern as action_plan.py.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.db.mongo import get_database
from app.services.conversation import HISTORY_WINDOW, get_conversation_history
from app.services.embeddings import generate_embedding
from app.services.llm_client import LLMError, chat_completion
from app.services.vector_store import search_similar

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Supported application types (requirement 6.1)
# ---------------------------------------------------------------------------

APPLICATION_TYPES = Literal[
    "fee_extension",
    "leave_request",
    "course_withdrawal",
    "transcript_request",
    "scholarship_request",
    "department_transfer",
    "exam_related",
]

# Human-readable labels used in the generated letter subject line
APP_TYPE_LABELS: dict[str, str] = {
    "fee_extension":       "Fee Extension Request",
    "leave_request":       "Leave of Absence Request",
    "course_withdrawal":   "Course Withdrawal Request",
    "transcript_request":  "Official Transcript Request",
    "scholarship_request": "Scholarship Application",
    "department_transfer": "Department Transfer Request",
    "exam_related":        "Examination-Related Request",
}

# Generic recipient line per application type — avoids hallucinating specific office names
APP_TYPE_RECIPIENT: dict[str, str] = {
    "fee_extension":       "The Finance Officer / Head of Accounts",
    "leave_request":       "The Head of Department",
    "course_withdrawal":   "The Head of Department / Academic Registrar",
    "transcript_request":  "The Registrar / Examination Controller",
    "scholarship_request": "The Scholarship Committee / Finance Officer",
    "department_transfer": "The Head of Department / Dean of Faculty",
    "exam_related":        "The Examination Controller",
}

# ---------------------------------------------------------------------------
# Task 5.2 — Rule-based clarifying-question check
# ---------------------------------------------------------------------------

# Fields required per application type.
# "reason" means body.reason must be non-empty.
# "target_department" is a hint we check in reason text for transfer requests.
_REQUIRED_FIELDS: dict[str, list[str]] = {
    "fee_extension":       ["reason"],
    "leave_request":       ["reason"],
    "course_withdrawal":   ["reason"],
    "transcript_request":  [],          # purpose is optional for MVP
    "scholarship_request": ["reason"],
    "department_transfer": ["reason"],
    "exam_related":        ["reason"],
}

_CLARIFYING_QUESTIONS: dict[str, str] = {
    "fee_extension":       "Why do you need a fee extension? "
                           "(e.g., medical emergency, financial difficulty, awaiting scholarship)",
    "leave_request":       "Why are you requesting leave, and for how long? "
                           "(e.g., medical, personal, family emergency — include approximate dates)",
    "course_withdrawal":   "Why do you need to withdraw from the course? "
                           "(e.g., medical, schedule conflict, academic difficulty)",
    "scholarship_request": "Why are you applying for this scholarship? "
                           "(e.g., financial need, academic merit, specific circumstances)",
    "department_transfer": "Why do you want to transfer departments, and which department are you "
                           "requesting to transfer to?",
    "exam_related":        "Please describe your examination-related issue. "
                           "(e.g., missed exam, wrong admit card details, clashing schedule)",
}


def check_clarification_needed(
    application_type: str,
    reason: Optional[str],
) -> Optional[str]:
    """
    Rule-based check: return a clarifying question string if required info
    is missing, or None if we have enough to proceed.
    """
    required = _REQUIRED_FIELDS.get(application_type, [])
    if "reason" in required and not (reason and reason.strip()):
        return _CLARIFYING_QUESTIONS.get(
            application_type,
            "Could you provide more details about your request?",
        )
    return None


# ---------------------------------------------------------------------------
# LLM output schema
# ---------------------------------------------------------------------------

class ApplicationOutput(BaseModel):
    application_type: str
    body_text: str      # full formal letter body, paragraphs only (no salutation/closing)


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_SYSTEM_TEMPLATE = """\
You are CampusFlow AI, helping a university student write a formal application letter.

Generate ONLY the body text of the formal letter (paragraphs between the salutation and 
closing). Do NOT include "Dear Sir/Madam", "Yours sincerely", the student's name, or 
the subject line — those are added separately by the system.

Rules:
- Use a formal, respectful tone appropriate for a university application.
- Pre-fill student details from the profile provided below.
- Use ONLY the policy/deadline information from the CONTEXT sections if relevant.
- If a specific office name, deadline, or policy detail is NOT in the context, write 
  [to be confirmed] as a placeholder — do NOT invent it.
- Keep the letter concise (3–5 paragraphs maximum).

STUDENT PROFILE:
  Name       : {name}
  Department : {department}
  Semester   : {semester}
  Batch      : {batch}

APPLICATION TYPE: {app_type_label}

{context_section}

{conversation_section}

Respond with ONLY valid JSON in this exact format, no markdown:
{{"application_type": "{application_type}", "body_text": "<paragraphs here>"}}
"""

_RETRY_SUFFIX = (
    "\n\nIMPORTANT: Respond with ONLY valid JSON: "
    '{"application_type": "...", "body_text": "..."} — no markdown, no explanation.'
)

# ---------------------------------------------------------------------------
# Public API (Task 5.1)
# ---------------------------------------------------------------------------

async def generate_application(
    application_type: str,
    user_id: str,
    university_id: str,
    reason: Optional[str] = None,
    conversation_id: Optional[str] = None,
) -> dict:
    """
    Generate a formal application letter for a student.

    Parameters
    ----------
    application_type : one of the 7 supported types (see APPLICATION_TYPES)
    user_id          : student's MongoDB _id string — used to fetch profile
    university_id    : used for KB retrieval scoping
    reason           : student's description of why they need the application
    conversation_id  : optional — prior chat turn for context pre-fill

    Returns
    -------
    {"application_type": str, "body_text": str}
        — application ready for preview/PDF

    {"clarifying_question": str}
        — more information needed before generation (Task 5.2)
    """
    # ── Task 5.2 — Clarifying question check (before any LLM call) ───────────
    clarification = check_clarification_needed(application_type, reason)
    if clarification:
        logger.info(
            "Application generator: clarification needed for type=%r student=%s",
            application_type, user_id,
        )
        return {"clarifying_question": clarification}

    # ── Fetch student profile ─────────────────────────────────────────────────
    profile = await _fetch_student_profile(user_id)

    # ── Retrieve KB context (no hard gate — assumption C) ────────────────────
    retrieval_text = reason or application_type.replace("_", " ")
    context_block = await _retrieve_context(retrieval_text, university_id)

    # ── Load recent conversation turns for context (assumption A) ─────────────
    conversation_block = ""
    if conversation_id:
        history = await get_conversation_history(
            student_id=user_id,
            conversation_id=conversation_id,
            window=4,
        )
        if history:
            lines = [f"  {m['role'].capitalize()}: {m['content']}" for m in history]
            conversation_block = "RELEVANT CONVERSATION CONTEXT:\n" + "\n".join(lines)

    # ── Build the full context section for the prompt ─────────────────────────
    context_section = (
        f"POLICY CONTEXT FROM KNOWLEDGE BASE:\n{context_block}"
        if context_block
        else "POLICY CONTEXT: No relevant policy documents found — use [to be confirmed] for "
             "any office names, deadlines, or specific policies."
    )

    # ── Add reason to the prompt if provided ─────────────────────────────────
    if reason:
        conversation_block = (
            f"STUDENT'S REASON: {reason}\n\n" + conversation_block
        ).strip()

    # ── Build messages ────────────────────────────────────────────────────────
    system_prompt = _SYSTEM_TEMPLATE.format(
        name=profile.get("name", "[Student Name]"),
        department=profile.get("department", "[Department]"),
        semester=profile.get("semester", "[Semester]"),
        batch=profile.get("batch", "[Batch]"),
        app_type_label=APP_TYPE_LABELS.get(application_type, application_type),
        application_type=application_type,
        context_section=context_section,
        conversation_section=conversation_block,
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",
         "content": f"Please generate the formal application for: {application_type}"},
    ]

    # ── LLM call with parse + retry ───────────────────────────────────────────
    result = await _call_and_parse(messages, attempt=1)

    if result is None:
        messages_retry = [
            {"role": "system", "content": system_prompt + _RETRY_SUFFIX},
            {"role": "user",
             "content": f"Please generate the formal application for: {application_type}"},
        ]
        result = await _call_and_parse(messages_retry, attempt=2)

    if result is None:
        logger.error(
            "Application generation failed after 2 attempts: type=%r student=%s",
            application_type, user_id,
        )
        # Return a generic placeholder rather than crashing — student can edit it
        return {
            "application_type": application_type,
            "body_text": (
                "I respectfully request your consideration of this application. "
                "Please find the details of my situation as described verbally. "
                "I am unable to provide a fully generated letter at this time — "
                "please complete this application manually or try again."
            ),
        }

    logger.info(
        "Application generated: type=%r  student=%s  body_len=%d",
        application_type, user_id, len(result.body_text),
    )
    return {
        "application_type": result.application_type,
        "body_text": result.body_text,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _fetch_student_profile(user_id: str) -> dict:
    """Fetch student profile from DB. Returns empty dict on failure."""
    try:
        db = get_database()
        profile = await db["student_profiles"].find_one({"user_id": user_id})
        return profile or {}
    except Exception as exc:
        logger.warning("Could not fetch student profile for %s: %s", user_id, exc)
        return {}


async def _retrieve_context(query: str, university_id: str) -> str:
    """
    Retrieve relevant KB chunks. Returns formatted context block or empty string.
    No hard threshold gate — application generation proceeds regardless.
    """
    try:
        embedding = await generate_embedding(query)
        results = await search_similar(
            query_embedding=embedding,
            university_id=university_id,
            category=None,
            top_k=3,
            min_score=settings.ACTION_PLAN_MIN_SCORE,
        )
        if not results:
            return ""
        lines = []
        for i, chunk in enumerate(results, start=1):
            lines.append(f"[{i}] (Category: {chunk['category']})\n{chunk['chunk_text']}")
        return "\n\n".join(lines)
    except Exception as exc:
        logger.warning("KB retrieval failed for application generation: %s", exc)
        return ""


async def _call_and_parse(
    messages: list[dict],
    attempt: int,
) -> ApplicationOutput | None:
    """Make one LLM call and attempt to parse. Returns None on any failure."""
    try:
        content = await chat_completion(
            messages=messages,
            temperature=0.3,   # slightly higher than action plan for natural letter prose
            max_tokens=768,
            json_mode=True,
        )
    except LLMError as exc:
        logger.warning("Application LLM call failed on attempt %d: %s", attempt, exc)
        return None

    return _parse(content, attempt)


def _parse(content: str, attempt: int) -> ApplicationOutput | None:
    """Parse and validate raw LLM output. Returns None on any error."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        logger.warning(
            "App generator attempt %d: JSON decode failed — raw=%r", attempt, content[:120]
        )
        return None
    try:
        return ApplicationOutput(**data)
    except (ValidationError, TypeError) as exc:
        logger.warning(
            "App generator attempt %d: validation failed — data=%r  err=%s",
            attempt, data, exc,
        )
        return None
