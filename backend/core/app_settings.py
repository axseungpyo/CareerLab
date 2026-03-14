"""Runtime app settings — persisted to JSON file, editable via API + settings UI."""

import json
from pathlib import Path
from pydantic import BaseModel


SETTINGS_FILE = Path(__file__).parent.parent / "data" / "app_settings.json"


class ProviderSettings(BaseModel):
    """Per-provider auth configuration.

    Claude auth_mode: "cli" (claude -p) | "api_key" (Anthropic API Key)
    OpenAI auth_mode: "codex_cli" (~/.codex/auth.json) | "oauth" (토큰 파일) | "api_key"
    """
    enabled: bool = False
    auth_mode: str = "api_key"
    api_key: str = ""
    credentials_path: str = ""


class SupabaseSettings(BaseModel):
    """Supabase connection settings."""
    url: str = ""
    anon_key: str = ""
    service_role_key: str = ""


class LLMSettings(BaseModel):
    """LLM provider configuration."""
    claude: ProviderSettings = ProviderSettings(
        enabled=True, auth_mode="cli",
    )
    openai: ProviderSettings = ProviderSettings(
        enabled=True, auth_mode="api_key",
    )
    brave_api_key: str = ""
    brave_search_enabled: bool = True


class FeatureFlags(BaseModel):
    """Feature on/off switches."""
    resume_generation: bool = True
    feedback_analysis: bool = True
    mock_interview: bool = True
    question_generation: bool = True
    company_analysis: bool = True
    file_parsing: bool = True
    embedding: bool = True
    docx_export: bool = True
    research_import: bool = True


class AppSettings(BaseModel):
    """Top-level runtime settings."""
    llm: LLMSettings = LLMSettings()
    supabase: SupabaseSettings = SupabaseSettings()
    features: FeatureFlags = FeatureFlags()


def _ensure_data_dir() -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)


def load_app_settings() -> AppSettings:
    """Load settings from JSON file, or return defaults."""
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            return AppSettings.model_validate(data)
        except Exception:
            pass
    return AppSettings()


def save_app_settings(settings: AppSettings) -> None:
    """Persist settings to JSON file."""
    _ensure_data_dir()
    SETTINGS_FILE.write_text(
        settings.model_dump_json(indent=2),
        encoding="utf-8",
    )


def update_app_settings(partial: dict) -> AppSettings:
    """Merge partial update into current settings and save."""
    current = load_app_settings()
    data = current.model_dump()
    _deep_merge(data, partial)
    updated = AppSettings.model_validate(data)
    save_app_settings(updated)
    return updated


def _deep_merge(base: dict, override: dict) -> None:
    """Recursively merge override into base."""
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value
