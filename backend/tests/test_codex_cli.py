"""Tests for Codex CLI token loader."""

import json
import time
from pathlib import Path

import pytest

from core.codex_cli import CodexTokenManager, CodexTokenError


@pytest.fixture
def valid_auth(tmp_path):
    auth_file = tmp_path / "auth.json"
    auth_file.write_text(json.dumps({
        "auth_mode": "chatgpt",
        "tokens": {
            "access_token": "codex-test-token-123",
            "refresh_token": "rt-xxx",
            "id_token": "id-xxx",
            "account_id": "acc-123",
        },
        "last_refresh": time.time(),
    }))
    return auth_file


@pytest.fixture
def stale_auth(tmp_path):
    auth_file = tmp_path / "auth.json"
    auth_file.write_text(json.dumps({
        "auth_mode": "chatgpt",
        "tokens": {"access_token": "stale-token"},
        "last_refresh": time.time() - 50000,  # > 8 hours ago
    }))
    return auth_file


def test_load_valid_token(valid_auth):
    mgr = CodexTokenManager(valid_auth)
    assert mgr.access_token == "codex-test-token-123"


def test_check_status_valid(valid_auth):
    mgr = CodexTokenManager(valid_auth)
    status = mgr.check_status()
    assert status["status"] == "valid"


def test_file_not_found():
    with pytest.raises(CodexTokenError):
        CodexTokenManager(Path("/nonexistent/auth.json"))


def test_missing_access_token(tmp_path):
    auth_file = tmp_path / "auth.json"
    auth_file.write_text(json.dumps({"tokens": {}, "last_refresh": time.time()}))
    with pytest.raises(CodexTokenError):
        CodexTokenManager(auth_file)


def test_stale_token_status(stale_auth):
    mgr = CodexTokenManager(stale_auth)
    status = mgr.check_status()
    # Stale but still returns token (file reload attempted)
    assert mgr.access_token == "stale-token"
