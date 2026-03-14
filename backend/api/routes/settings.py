"""Settings API — runtime configuration management with key masking."""

from fastapi import APIRouter
from pydantic import BaseModel

from core.app_settings import (
    AppSettings,
    load_app_settings,
    save_app_settings,
    update_app_settings,
)

router = APIRouter()


def _mask_key(key: str) -> str:
    """Mask API key for display: sk-abc...xyz"""
    if not key or len(key) < 8:
        return "●" * len(key) if key else ""
    return key[:6] + "●" * (len(key) - 10) + key[-4:]


def _masked_settings(s: AppSettings) -> dict:
    """Return settings with API keys masked for frontend display."""
    data = s.model_dump()
    data["llm"]["claude"]["api_key_masked"] = _mask_key(s.llm.claude.api_key)
    data["llm"]["claude"]["has_key"] = bool(s.llm.claude.api_key)
    data["llm"]["openai"]["api_key_masked"] = _mask_key(s.llm.openai.api_key)
    data["llm"]["openai"]["has_key"] = bool(s.llm.openai.api_key)
    data["llm"]["brave_api_key_masked"] = _mask_key(s.llm.brave_api_key)
    data["llm"]["has_brave_key"] = bool(s.llm.brave_api_key)
    data["supabase"]["has_url"] = bool(s.supabase.url)
    data["supabase"]["has_anon_key"] = bool(s.supabase.anon_key)
    data["supabase"]["has_service_key"] = bool(s.supabase.service_role_key)
    data["supabase"]["url_display"] = s.supabase.url or ""
    data["supabase"]["anon_key_masked"] = _mask_key(s.supabase.anon_key)
    data["supabase"]["service_key_masked"] = _mask_key(s.supabase.service_role_key)
    # Remove raw keys from response
    data["llm"]["claude"]["api_key"] = ""
    data["llm"]["openai"]["api_key"] = ""
    data["llm"]["brave_api_key"] = ""
    data["supabase"]["anon_key"] = ""
    data["supabase"]["service_role_key"] = ""
    return data


# ── Settings CRUD ──

@router.get("")
async def get_settings():
    """Get current app settings (keys masked)."""
    s = load_app_settings()
    return _masked_settings(s)


class SettingsUpdateRequest(BaseModel):
    llm: dict | None = None
    supabase: dict | None = None
    features: dict | None = None


@router.put("")
async def put_settings(req: SettingsUpdateRequest):
    """Update settings. Empty string keys are preserved; omitted keys keep current value."""
    current = load_app_settings()
    update_data = req.model_dump(exclude_none=True)

    # For API keys: empty string = "clear it", missing = "keep current"
    if "llm" in update_data:
        llm = update_data["llm"]
        if "claude" in llm:
            if "api_key" in llm["claude"] and llm["claude"]["api_key"] == "":
                pass  # keep empty = clear
            elif "api_key" not in llm["claude"]:
                llm["claude"]["api_key"] = current.llm.claude.api_key
        if "openai" in llm:
            if "api_key" in llm["openai"] and llm["openai"]["api_key"] == "":
                pass
            elif "api_key" not in llm["openai"]:
                llm["openai"]["api_key"] = current.llm.openai.api_key
        if "brave_api_key" not in llm:
            llm["brave_api_key"] = current.llm.brave_api_key

    if "supabase" in update_data:
        sb = update_data["supabase"]
        for field in ["url", "anon_key", "service_role_key"]:
            if field not in sb:
                sb[field] = getattr(current.supabase, field)

    result = update_app_settings(update_data)
    # Reset token managers so they re-read on next use
    from core.oauth_loader import reset_openai_oauth
    from core.codex_cli import reset_codex_token_manager
    reset_openai_oauth()
    reset_codex_token_manager()
    return _masked_settings(result)


# ── Connection Status ──

class StatusResponse(BaseModel):
    claude: dict
    openai: dict
    supabase: dict
    brave: dict


@router.get("/status")
async def connection_status():
    """Check connection status for all services."""
    from config.settings import get_settings as get_env_settings
    app = load_app_settings()
    env = get_env_settings()

    # Claude
    claude_st = _check_provider_status(
        "Claude", app.llm.claude, env_key=env.anthropic_api_key
    )

    # OpenAI
    openai_st = _check_provider_status(
        "OpenAI", app.llm.openai, env_key=env.openai_api_key
    )

    # Supabase
    supabase_st = {"status": "missing", "message": "Supabase URL이 설정되지 않았습니다."}
    url = app.supabase.url or env.supabase_url
    key = app.supabase.service_role_key or env.supabase_service_role_key
    if url and key:
        supabase_st = {"status": "valid", "message": f"연결됨: {url[:50]}"}
    elif url:
        supabase_st = {"status": "partial", "message": "URL은 있지만 Service Role Key가 없습니다."}

    # Brave
    brave_key = app.llm.brave_api_key or env.brave_api_key
    brave_st = {"status": "disabled", "message": "Brave Search가 비활성화되어 있습니다."}
    if app.llm.brave_search_enabled:
        if brave_key:
            brave_st = {"status": "valid", "message": "API Key가 설정되어 있습니다."}
        else:
            brave_st = {"status": "missing", "message": "BRAVE_API_KEY가 없습니다."}

    return {
        "claude": claude_st,
        "openai": openai_st,
        "supabase": supabase_st,
        "brave": brave_st,
    }


# backward compat
@router.get("/oauth-status")
async def oauth_status():
    status = await connection_status()
    return {"claude": status["claude"], "openai": status["openai"]}


def _check_provider_status(name: str, cfg, env_key: str = "") -> dict:
    if not cfg.enabled:
        return {"status": "disabled", "message": f"{name}이(가) 비활성화되어 있습니다."}

    # Claude CLI mode
    if cfg.auth_mode == "cli":
        import shutil
        if shutil.which("claude"):
            return {"status": "valid", "message": "Claude CLI 연결됨 (구독 인증 사용)"}
        return {"status": "missing", "message": "claude CLI를 찾을 수 없습니다."}

    # Codex CLI mode (OpenAI)
    if cfg.auth_mode == "codex_cli":
        import shutil
        if not shutil.which("codex"):
            return {"status": "missing", "message": "codex CLI를 찾을 수 없습니다."}
        try:
            from core.codex_cli import get_codex_token_manager
            mgr = get_codex_token_manager()
            return mgr.check_status()
        except Exception as e:
            return {"status": "missing", "message": str(e)}

    # Check API key in settings JSON
    if cfg.api_key:
        return {"status": "valid", "message": f"API Key가 설정되어 있습니다. ({_mask_key(cfg.api_key)})"}

    # Check OAuth (OpenAI only)
    if cfg.auth_mode == "oauth" and cfg.credentials_path:
        try:
            from pathlib import Path
            from core.oauth_loader import get_openai_oauth
            mgr = get_openai_oauth(Path(cfg.credentials_path))
            return mgr.check_status()
        except Exception:
            pass

    # Check env (.env file loaded by pydantic-settings)
    if env_key:
        return {"status": "valid", "message": ".env 환경변수에서 로드됨."}

    return {"status": "missing", "message": f"{name} API Key가 설정되지 않았습니다."}
