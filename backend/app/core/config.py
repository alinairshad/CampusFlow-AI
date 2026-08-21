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
    RAG_MIN_SCORE: float = 0.7          # cosine similarity threshold; tune in .env

    # University (fixed for MVP single-university deployment)
    UNIVERSITY_ID: str = "university_mvp_001"

    # CORS — comma-separated list loaded from env
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
