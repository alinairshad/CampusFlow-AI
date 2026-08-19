"""
Problem-to-Action plan generation.
Retrieves context, generates structured action plan via LLM.
Implemented in Stage 4.
"""


async def generate_action_plan(
    query: str,
    university_id: str,
    category: str,
) -> dict:
    """
    Generate a structured action plan for a student's problem.
    Returns: {
        "department": str,
        "required_docs": list[str],
        "steps": list[str],
        "next_action": str,
        "sources": list[dict],
        "found": bool,
    }
    """
    raise NotImplementedError("Implemented in Stage 4")
