"""
AI Application Generator.
Generates formal application text grounded in retrieved policy context.
Implemented in Stage 5.
"""


async def generate_application(
    application_type: str,
    student_profile: dict,
    conversation_context: str,
    university_id: str,
) -> dict:
    """
    Generate a formal application.
    Returns: {"application_type": str, "body_text": str}
    OR: {"clarifying_question": str} if required info is missing.
    """
    raise NotImplementedError("Implemented in Stage 5")
