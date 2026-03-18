"""LLM router — routes tasks to Claude (CLI/API Key) or OpenAI (Codex CLI/OAuth/API Key)."""

import json
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import AsyncIterator

import httpx
from openai import AsyncOpenAI
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config.settings import get_settings
from core.app_settings import load_app_settings


# ── TaskType & Model mapping ──────────────────────────────────────────

class TaskType(str, Enum):
    resume_gen = "resume_gen"
    feedback = "feedback"
    mock_interview = "mock_interview"
    question_gen = "question_gen"
    company_analysis = "company_analysis"
    file_parsing = "file_parsing"
    embedding = "embedding"


class Provider(str, Enum):
    claude = "claude"
    openai = "openai"


@dataclass(frozen=True)
class ModelConfig:
    provider: Provider
    model_name: str
    max_tokens: int
    stream_default: bool = False


TASK_MODEL_MAP: dict[TaskType, ModelConfig] = {
    TaskType.resume_gen: ModelConfig(
        Provider.claude, "claude-sonnet-4-6", 4096, stream_default=True
    ),
    TaskType.feedback: ModelConfig(
        Provider.claude, "claude-sonnet-4-6", 4096
    ),
    TaskType.mock_interview: ModelConfig(
        Provider.claude, "claude-sonnet-4-6", 2048, stream_default=True
    ),
    TaskType.question_gen: ModelConfig(
        Provider.claude, "claude-sonnet-4-6", 4096
    ),
    TaskType.company_analysis: ModelConfig(
        Provider.claude, "claude-sonnet-4-6", 4096
    ),
    TaskType.file_parsing: ModelConfig(
        Provider.claude, "claude-sonnet-4-6", 4096
    ),
    TaskType.embedding: ModelConfig(
        Provider.openai, "text-embedding-3-small", 0
    ),
}


# ── Errors ───────────────────────────────────────────────────────────

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


class LLMCallError(Exception):
    """LLM 호출에 실패했습니다."""


# ── Key resolution ───────────────────────────────────────────────────

def _resolve_claude_api_key() -> str:
    """Resolve Claude API key: settings JSON → env. (CLI mode bypasses this.)"""
    app = load_app_settings()
    cfg = app.llm.claude
    if cfg.api_key:
        return cfg.api_key
    import os
    env_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if env_key:
        return env_key
    raise LLMCallError(
        "Claude API 키가 설정되지 않았습니다. 설정에서 API Key를 입력하거나 CLI 모드를 사용해주세요."
    )


def _resolve_openai_api_key() -> str:
    """Resolve OpenAI API key: codex_cli token → settings JSON → oauth → env."""
    app = load_app_settings()
    cfg = app.llm.openai

    # 1. Codex CLI token
    if cfg.auth_mode == "codex_cli":
        from core.codex_cli import get_codex_token_manager
        mgr = get_codex_token_manager()
        return mgr.access_token

    # 2. Direct API key in settings
    if cfg.api_key:
        return cfg.api_key

    # 3. OAuth credential file
    if cfg.auth_mode == "oauth" and cfg.credentials_path:
        try:
            from core.oauth_loader import get_openai_oauth
            oauth = get_openai_oauth(Path(cfg.credentials_path))
            return oauth.access_token
        except Exception:
            pass

    # 4. Env var fallback
    settings = get_settings()
    if settings.openai_api_key:
        return settings.openai_api_key

    raise LLMCallError(
        "OpenAI API 키가 설정되지 않았습니다. Codex CLI, OAuth, 또는 API Key를 설정해주세요."
    )


def _get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=_resolve_openai_api_key())


def _get_claude_auth_header() -> dict[str, str]:
    return {
        "x-api-key": _resolve_claude_api_key(),
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }


# ── Claude CLI call ─────────────────────────────────────────────────

async def call_claude_via_cli(
    messages: list[dict],
    task_type: TaskType,
    stream: bool = False,
) -> str | AsyncIterator[str]:
    """Call Claude via local CLI (uses CLI's own subscription auth)."""
    from core.claude_cli import call_claude_cli, stream_claude_cli
    config = TASK_MODEL_MAP[task_type]
    if stream:
        return stream_claude_cli(messages, model=config.model_name, max_tokens=config.max_tokens)
    return await call_claude_cli(messages, model=config.model_name, max_tokens=config.max_tokens)


# ── Claude API call ──────────────────────────────────────────────────

async def call_claude(
    messages: list[dict],
    task_type: TaskType,
    stream: bool = False,
) -> str | AsyncIterator[str]:
    """Call Claude via API (x-api-key)."""
    config = TASK_MODEL_MAP[task_type]
    system_msg = None
    api_messages = []
    for m in messages:
        if m["role"] == "system":
            system_msg = m["content"]
        else:
            api_messages.append({"role": m["role"], "content": m["content"]})

    body: dict = {
        "model": config.model_name,
        "max_tokens": config.max_tokens,
        "messages": api_messages,
    }
    if system_msg:
        body["system"] = system_msg
    if stream:
        return _stream_claude(body)

    resp = await _call_claude_with_retry(body)
    data = resp.json()
    return data["content"][0]["text"]


async def _call_claude_with_retry(body: dict) -> httpx.Response:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        retry=retry_if_exception_type(LLMCallError),
        reraise=True,
    )
    async def _inner() -> httpx.Response:
        headers = _get_claude_auth_header()
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(ANTHROPIC_API_URL, json=body, headers=headers)
        if resp.status_code >= 400:
            raise LLMCallError(f"Claude API 호출 실패 (HTTP {resp.status_code}): {resp.text}")
        return resp
    return await _inner()


async def _stream_claude(body: dict) -> AsyncIterator[str]:
    headers = _get_claude_auth_header()
    body["stream"] = True
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", ANTHROPIC_API_URL, json=body, headers=headers) as resp:
            if resp.status_code >= 400:
                error_body = await resp.aread()
                raise LLMCallError(f"Claude 스트리밍 실패 (HTTP {resp.status_code}): {error_body.decode()}")
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str == "[DONE]":
                    return
                try:
                    event = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                if event.get("type") == "content_block_delta":
                    delta = event.get("delta", {})
                    if text := delta.get("text"):
                        yield text


# ── OpenAI call ──────────────────────────────────────────────────────

async def call_openai(
    messages: list[dict],
    task_type: TaskType,
    json_mode: bool = True,
) -> str:
    config = TASK_MODEL_MAP[task_type]
    client = _get_openai_client()
    kwargs: dict = {
        "model": config.model_name,
        "messages": messages,
        "max_tokens": config.max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


# ── JSON mode helper ─────────────────────────────────────────────────

def _inject_json_instruction(messages: list[dict]) -> list[dict]:
    """Inject JSON output instruction into system prompt for Claude (no native JSON mode)."""
    json_suffix = "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, no explanation — just the raw JSON object."
    result = []
    found_system = False
    for m in messages:
        if m["role"] == "system" and not found_system:
            result.append({"role": "system", "content": m["content"] + json_suffix})
            found_system = True
        else:
            result.append(m)
    if not found_system:
        result.insert(0, {"role": "system", "content": json_suffix.strip()})
    return result


# ── Unified entry point ──────────────────────────────────────────────

async def call_llm(
    messages: list[dict],
    task_type: TaskType,
    stream: bool = False,
    json_mode: bool = False,
) -> str | AsyncIterator[str]:
    """Unified LLM call — routes based on provider + auth_mode.

    Claude: "cli" → claude -p subprocess, "api_key" → Anthropic API
    OpenAI: "codex_cli" → Codex token, "oauth" → token file, "api_key" → direct key
    """
    config = TASK_MODEL_MAP[task_type]
    app = load_app_settings()

    if config.provider == Provider.claude:
        # Claude doesn't have native JSON mode — inject instruction into system prompt
        if json_mode:
            messages = _inject_json_instruction(messages)
        if app.llm.claude.auth_mode == "cli":
            return await call_claude_via_cli(messages, task_type, stream=stream)
        else:
            return await call_claude(messages, task_type, stream=stream)
    else:
        return await call_openai(messages, task_type, json_mode=json_mode or True)
