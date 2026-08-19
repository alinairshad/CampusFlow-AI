"""
LLM-based intent classification.
Returns structured {category, type} JSON.
Implemented in Stage 3.
"""


async def classify_intent(query: str) -> dict:
    """
    Classify a student query.
    Returns: {"category": <enum>, "type": "knowledge" | "problem" | "application"}
    """
    raise NotImplementedError("Implemented in Stage 3")
