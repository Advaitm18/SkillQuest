from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./skillquest.db"
    redis_url: str = "redis://localhost:6379"
    secret_key: str = "skillquest-super-secret-key-dev-2024"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    # Comma-separated fallback models tried if the primary Ollama model is unavailable.
    # Example: "gemma2:2b,phi3:mini"
    ollama_fallback_models: str = "gemma2:2b"
    # OpenAI Chat Completions API — used when Ollama is unavailable or returns invalid JSON
    openai_api_key: Optional[str] = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    # D-ID avatar streaming (https://studio.d-id.com)
    did_api_key: Optional[str] = None
    did_presenter_url: str = "https://create-images-results.d-id.com/api_docs/assets/noelle.jpeg"
    # Public-facing URL of this backend (used so D-ID can fetch the local avatar image).
    # For local dev use ngrok: ngrok http 8000 → set this to the ngrok https URL.
    # Leave blank to use did_presenter_url above.
    backend_public_url: Optional[str] = None

    # ElevenLabs TTS — used when D-ID is unavailable (fallback voice for the 2D avatar UI).
    elevenlabs_api_key: Optional[str] = None
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel (default)
    elevenlabs_model_id: str = "eleven_multilingual_v2"

    # Quiz performance: serve from DB pool first (ms) before calling LLMs (seconds).
    question_pool_first: bool = True
    # Postgres / MySQL connection pool (ignored for SQLite).
    db_pool_size: int = 10
    db_max_overflow: int = 24

    class Config:
        env_file = ".env"


settings = Settings()
