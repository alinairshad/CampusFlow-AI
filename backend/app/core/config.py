from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "campusflow"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # LLM provider
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = "https://openrouter.ai/api/v1"
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"
    CHAT_MODEL: str = "openai/gpt-4o-mini"

    # RAG retrieval
    RAG_MIN_SCORE: float = 0.7          # cosine similarity threshold for Q&A; tune in .env
    ACTION_PLAN_MIN_SCORE: float = 0.65 # lower threshold for problem queries — problem
                                        # descriptions are more paraphrased from policy text

    # University (fixed for MVP single-university deployment)
    UNIVERSITY_ID: str = "university_mvp_001"

    # CORS — declared as str so pydantic-settings never tries to JSON-decode it.
    # Accepts both formats from the environment:
    #   plain : http://localhost:5173,https://app.vercel.app
    #   JSON  : ["http://localhost:5173","https://app.vercel.app"]
    # main.py reads settings.allowed_origins_list (a property) for the actual list.
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        """
        Parse ALLOWED_ORIGINS into a list, accepting both:
          - plain comma-separated: 'http://localhost:5173,https://app.vercel.app'
          - JSON array:           '["http://localhost:5173","https://app.vercel.app"]'
        """
        import json
        raw = self.ALLOWED_ORIGINS.strip()
        if raw.startswith("["):
            try:
                return [str(o).strip() for o in json.loads(raw) if str(o).strip()]
            except json.JSONDecodeError:
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
