"""Application settings loaded from environment variables + runtime settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase (env fallback)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # OpenAI (env fallback)
    openai_api_key: str = ""

    # Anthropic (env fallback)
    anthropic_api_key: str = ""

    # Search providers (env fallback)
    tavily_api_key: str = ""
    perplexity_api_key: str = ""

    # App
    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_effective_supabase() -> tuple[str, str]:
    """Get effective Supabase URL and service key (settings JSON → env)."""
    from core.app_settings import load_app_settings
    app = load_app_settings()
    env = get_settings()
    url = app.supabase.url or env.supabase_url
    key = app.supabase.service_role_key or env.supabase_service_role_key
    return url, key
