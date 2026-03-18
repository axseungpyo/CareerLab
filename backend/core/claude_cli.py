"""Claude CLI bridge — call Claude via `claude -p` command (uses CLI's own auth)."""

import asyncio
import json
import shutil
from typing import AsyncIterator


class ClaudeCLIError(Exception):
    """Claude CLI 호출에 실패했습니다."""


def _find_claude_bin() -> str:
    """Find the claude binary path."""
    path = shutil.which("claude")
    if not path:
        raise ClaudeCLIError(
            "claude CLI를 찾을 수 없습니다. Claude Code가 설치되어 있는지 확인해주세요."
        )
    return path


async def call_claude_cli(
    messages: list[dict],
    model: str = "sonnet",
    max_tokens: int = 4096,
) -> str:
    """Call Claude via CLI in non-interactive mode and return full response."""
    claude_bin = _find_claude_bin()
    system_prompt, user_prompt = _build_prompts(messages)

    cmd = [
        claude_bin, "-p",
        "--output-format", "json",
        "--model", _normalize_model(model),
        "--no-session-persistence",
    ]
    if system_prompt:
        cmd.extend(["--system-prompt", system_prompt])

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(
        proc.communicate(input=user_prompt.encode("utf-8")),
        timeout=180,
    )

    if proc.returncode != 0:
        raise ClaudeCLIError(
            f"Claude CLI 오류 (exit {proc.returncode}): {stderr.decode()[:500]}"
        )

    output = stdout.decode("utf-8").strip()
    try:
        data = json.loads(output)
        result_text = data.get("result", output)
        # Remove bkit footer if present
        result_text = _strip_bkit_footer(result_text)
        return result_text
    except json.JSONDecodeError:
        return _strip_bkit_footer(output)


async def stream_claude_cli(
    messages: list[dict],
    model: str = "sonnet",
    max_tokens: int = 4096,
) -> AsyncIterator[str]:
    """Stream Claude response via CLI in real-time."""
    claude_bin = _find_claude_bin()
    system_prompt, user_prompt = _build_prompts(messages)

    cmd = [
        claude_bin, "-p",
        "--output-format", "stream-json",
        "--verbose",
        "--model", _normalize_model(model),
        "--no-session-persistence",
    ]
    if system_prompt:
        cmd.extend(["--system-prompt", system_prompt])

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    # Send input and close stdin
    proc.stdin.write(user_prompt.encode("utf-8"))
    await proc.stdin.drain()
    proc.stdin.close()

    # Read stdout line by line, extract assistant text deltas
    while True:
        line = await asyncio.wait_for(proc.stdout.readline(), timeout=180)
        if not line:
            break
        text = line.decode("utf-8").strip()
        if not text:
            continue
        try:
            event = json.loads(text)
        except json.JSONDecodeError:
            continue

        # Extract text content from stream events
        evt_type = event.get("type", "")

        if evt_type == "assistant" and event.get("subtype") == "text":
            # Direct text chunk
            content = event.get("content", "")
            if content:
                yield content

        elif evt_type == "content_block_delta":
            # Anthropic streaming format
            delta = event.get("delta", {})
            if txt := delta.get("text"):
                yield txt

        elif evt_type == "result":
            # Final result — extract if we haven't streamed anything
            result = event.get("result", "")
            if result:
                cleaned = _strip_bkit_footer(result)
                if cleaned:
                    yield cleaned
            break

    await proc.wait()


def _build_prompts(messages: list[dict]) -> tuple[str, str]:
    """Extract system prompt and build user prompt from messages list."""
    system_parts = []
    conversation_parts = []

    for m in messages:
        role = m.get("role", "")
        content = m.get("content", "")
        if role == "system":
            system_parts.append(content)
        elif role == "user":
            conversation_parts.append(content)
        elif role == "assistant":
            conversation_parts.append(f"[이전 응답]\n{content}")

    system_prompt = "\n\n".join(system_parts) if system_parts else ""
    user_prompt = "\n\n".join(conversation_parts) if conversation_parts else ""
    return system_prompt, user_prompt


def _normalize_model(model: str) -> str:
    """Map model names to claude CLI aliases."""
    mapping = {
        "claude-sonnet-4-6": "sonnet",
        "claude-sonnet-4-20250514": "sonnet",
        "claude-haiku-4-5-20251001": "haiku",
        "claude-haiku-4-5": "haiku",
        "claude-opus-4-6": "opus",
        "claude-opus-4-20250514": "opus",
    }
    return mapping.get(model, model)


def _strip_bkit_footer(text: str) -> str:
    """Remove bkit feature usage footer from response."""
    marker = "─────────────────────────────────────────────────"
    if marker in text:
        # Find first occurrence and cut there
        idx = text.find(marker)
        # Go back to find the start of the footer block (newlines before)
        while idx > 0 and text[idx - 1] in "\n\r ":
            idx -= 1
        text = text[:idx].rstrip()
    return text
