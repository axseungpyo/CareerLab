"""Codex CLI token loader — reads access_token from ~/.codex/auth.json for OpenAI SDK."""

import json
import time
from pathlib import Path


CODEX_AUTH_PATH = Path.home() / ".codex" / "auth.json"

# Token is considered stale after 8 hours (Codex CLI auto-refreshes)
TOKEN_STALE_SECONDS = 8 * 3600


class CodexTokenError(Exception):
    """Codex CLI 토큰 오류."""


class CodexTokenManager:
    """Load OpenAI access token from Codex CLI's auth.json."""

    def __init__(self, auth_path: Path | None = None):
        self._path = auth_path or CODEX_AUTH_PATH
        self._access_token: str = ""
        self._last_refresh: float = 0.0
        self._load_from_file()

    def _load_from_file(self) -> None:
        if not self._path.exists():
            raise CodexTokenError(
                f"Codex 인증 파일을 찾을 수 없습니다: {self._path}\n"
                "`codex login`을 실행하여 로그인해주세요."
            )
        data = json.loads(self._path.read_text())
        tokens = data.get("tokens", {})
        self._access_token = tokens.get("access_token", "")
        if not self._access_token:
            raise CodexTokenError(
                "Codex 인증 파일에 access_token이 없습니다. `codex login`을 다시 실행해주세요."
            )

        # Parse last_refresh for staleness check
        last_refresh = data.get("last_refresh")
        if isinstance(last_refresh, str):
            from datetime import datetime
            try:
                self._last_refresh = datetime.fromisoformat(
                    last_refresh.replace("Z", "+00:00")
                ).timestamp()
            except ValueError:
                self._last_refresh = time.time()
        elif isinstance(last_refresh, (int, float)):
            self._last_refresh = float(last_refresh)
        else:
            self._last_refresh = time.time()

    def _is_stale(self) -> bool:
        return time.time() - self._last_refresh > TOKEN_STALE_SECONDS

    @property
    def access_token(self) -> str:
        if self._is_stale():
            self._load_from_file()
        return self._access_token

    def check_status(self) -> dict:
        """Return token status for settings page."""
        try:
            _ = self.access_token
            if self._is_stale():
                return {
                    "status": "expired",
                    "message": "Codex 토큰이 오래되었습니다. `codex login`으로 갱신해주세요.",
                }
            return {
                "status": "valid",
                "message": "Codex CLI 연결됨 (ChatGPT 구독 인증 사용)",
            }
        except CodexTokenError as e:
            return {"status": "missing", "message": str(e)}


# Singleton
_manager: CodexTokenManager | None = None


def get_codex_token_manager(auth_path: Path | None = None) -> CodexTokenManager:
    global _manager
    if _manager is None:
        _manager = CodexTokenManager(auth_path)
    return _manager


def reset_codex_token_manager() -> None:
    global _manager
    _manager = None
