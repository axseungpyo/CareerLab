"""OAuth token manager — loads tokens from credential files (OpenAI only)."""

import json
import time
from pathlib import Path


class OAuthTokenExpiredError(Exception):
    """OAuth 토큰이 만료되었습니다."""


class OAuthTokenNotFoundError(Exception):
    """OAuth 토큰 파일을 찾을 수 없습니다."""


class OAuthTokenManager:
    """Generic OAuth token manager — loads from a JSON credentials file."""

    def __init__(self, credentials_path: Path, provider_name: str = "OAuth"):
        self._path = credentials_path
        self._provider = provider_name
        self._access_token: str | None = None
        self._expires_at: float = 0.0
        self._load_from_file()

    def _load_from_file(self) -> None:
        if not self._path.exists():
            raise OAuthTokenNotFoundError(
                f"{self._provider} 토큰 파일을 찾을 수 없습니다: {self._path}"
            )
        data = json.loads(self._path.read_text())
        self._access_token = data.get("accessToken") or data.get("access_token")
        expires_at = data.get("expiresAt") or data.get("expires_at")
        if not self._access_token or not expires_at:
            raise OAuthTokenNotFoundError(
                f"{self._provider} 토큰 파일에 accessToken/expiresAt이 없습니다."
            )
        if isinstance(expires_at, str):
            from datetime import datetime
            self._expires_at = datetime.fromisoformat(
                expires_at.replace("Z", "+00:00")
            ).timestamp()
        else:
            self._expires_at = float(expires_at)

    def _is_expired(self) -> bool:
        return time.time() >= (self._expires_at - 30)

    @property
    def access_token(self) -> str:
        if self._is_expired():
            self._load_from_file()
            if self._is_expired():
                raise OAuthTokenExpiredError(
                    f"{self._provider} 토큰이 만료되었습니다. CLI를 실행하여 갱신해주세요."
                )
        return self._access_token  # type: ignore[return-value]

    def get_auth_header(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}

    def check_status(self) -> dict:
        """Return token status without raising."""
        try:
            _ = self.access_token
            return {"status": "valid", "message": f"{self._provider} 토큰이 유효합니다."}
        except OAuthTokenExpiredError as e:
            return {"status": "expired", "message": str(e)}
        except OAuthTokenNotFoundError as e:
            return {"status": "missing", "message": str(e)}


# ── OpenAI OAuth ──

OPENAI_CREDENTIALS_PATH = Path.home() / ".openai" / ".credentials.json"

_openai_manager: OAuthTokenManager | None = None


def get_openai_oauth(credentials_path: Path | None = None) -> OAuthTokenManager:
    global _openai_manager
    if _openai_manager is None:
        _openai_manager = OAuthTokenManager(
            credentials_path or OPENAI_CREDENTIALS_PATH, "OpenAI"
        )
    return _openai_manager


def reset_openai_oauth() -> None:
    global _openai_manager
    _openai_manager = None
