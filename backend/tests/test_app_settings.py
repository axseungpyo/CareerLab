"""Tests for runtime app settings."""

import json
from pathlib import Path

from core.app_settings import (
    AppSettings,
    load_app_settings,
    save_app_settings,
    update_app_settings,
    SETTINGS_FILE,
)


def test_default_settings():
    s = AppSettings()
    assert s.llm.claude.enabled is True
    assert s.llm.claude.auth_mode == "cli"
    assert s.llm.openai.enabled is True
    assert s.llm.openai.auth_mode == "api_key"
    assert s.features.resume_generation is True
    assert s.supabase.url == ""


def test_openai_oauth_mode():
    s = AppSettings()
    s.llm.openai.auth_mode = "oauth"
    assert s.llm.openai.auth_mode == "oauth"


def test_toggle_feature():
    s = AppSettings()
    assert s.features.mock_interview is True
    s.features.mock_interview = False
    assert s.features.mock_interview is False


def test_disable_provider():
    s = AppSettings()
    s.llm.claude.enabled = False
    assert s.llm.claude.enabled is False


def test_serialization():
    s = AppSettings()
    s.llm.openai.auth_mode = "oauth"
    s.llm.openai.credentials_path = "/custom/path.json"
    data = json.loads(s.model_dump_json())
    restored = AppSettings.model_validate(data)
    assert restored.llm.openai.auth_mode == "oauth"
    assert restored.llm.openai.credentials_path == "/custom/path.json"


def test_deep_merge():
    from core.app_settings import _deep_merge
    base = {"a": {"b": 1, "c": 2}, "d": 3}
    _deep_merge(base, {"a": {"b": 99}, "e": 5})
    assert base == {"a": {"b": 99, "c": 2}, "d": 3, "e": 5}


def test_openai_oauth_credentials():
    """OpenAI OAuth should support custom credentials path."""
    s = AppSettings()
    s.llm.openai.auth_mode = "oauth"
    s.llm.openai.credentials_path = "~/.openai/.credentials.json"
    assert s.llm.openai.auth_mode == "oauth"
    assert "openai" in s.llm.openai.credentials_path
