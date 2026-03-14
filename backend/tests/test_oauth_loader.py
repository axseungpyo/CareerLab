"""Tests for OAuth token manager (OpenAI only)."""

import json
import time
from pathlib import Path

import pytest

from core.oauth_loader import (
    OAuthTokenManager,
    OAuthTokenExpiredError,
    OAuthTokenNotFoundError,
)


@pytest.fixture
def valid_credentials(tmp_path):
    cred_file = tmp_path / ".credentials.json"
    cred_file.write_text(json.dumps({
        "accessToken": "test-token-123",
        "expiresAt": time.time() + 3600,
    }))
    return cred_file


@pytest.fixture
def expired_credentials(tmp_path):
    cred_file = tmp_path / ".credentials.json"
    cred_file.write_text(json.dumps({
        "accessToken": "expired-token",
        "expiresAt": time.time() - 100,
    }))
    return cred_file


def test_load_valid_token(valid_credentials):
    mgr = OAuthTokenManager(valid_credentials, "OpenAI")
    assert mgr.access_token == "test-token-123"


def test_get_auth_header(valid_credentials):
    mgr = OAuthTokenManager(valid_credentials, "OpenAI")
    header = mgr.get_auth_header()
    assert header == {"Authorization": "Bearer test-token-123"}


def test_file_not_found():
    with pytest.raises(OAuthTokenNotFoundError):
        OAuthTokenManager(Path("/nonexistent/.credentials.json"), "OpenAI")


def test_expired_token_raises(expired_credentials):
    with pytest.raises(OAuthTokenExpiredError):
        mgr = OAuthTokenManager(expired_credentials, "OpenAI")
        _ = mgr.access_token


def test_check_status_valid(valid_credentials):
    mgr = OAuthTokenManager(valid_credentials, "OpenAI")
    status = mgr.check_status()
    assert status["status"] == "valid"


def test_check_status_expired(expired_credentials):
    mgr = OAuthTokenManager(expired_credentials, "OpenAI")
    status = mgr.check_status()
    assert status["status"] == "expired"


def test_iso_expires_at(tmp_path):
    cred_file = tmp_path / ".credentials.json"
    cred_file.write_text(json.dumps({
        "accessToken": "iso-token",
        "expiresAt": "2099-01-01T00:00:00Z",
    }))
    mgr = OAuthTokenManager(cred_file, "OpenAI")
    assert mgr.access_token == "iso-token"
