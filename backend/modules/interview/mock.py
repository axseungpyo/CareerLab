"""Mock interview session manager — Claude Sonnet streaming chat."""

import json
from typing import AsyncIterator

from supabase import create_client

from config.settings import get_settings
from core.llm_router import call_llm, TaskType
from core.prompt_engine import get_prompt_engine


MODE_INSTRUCTIONS = {
    "normal": "친절하고 전문적인 톤으로 진행합니다",
    "pressure": "답변의 약점을 파고들고, 반박하며, 구체적 근거를 요구합니다",
    "pt": "주제를 제시하고, 발표 후 날카로운 질문을 합니다",
}


class MockInterviewManager:
    """Manage mock interview sessions with streaming chat."""

    def __init__(self):
        settings = get_settings()
        self._db = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
        self._prompt = get_prompt_engine()

    def start_session(self, resume_id: str, mode: str = "normal") -> dict:
        """Create a new mock interview session."""
        row = {"resume_id": resume_id, "mode": mode, "status": "in_progress"}
        result = self._db.table("mock_sessions").insert(row).execute()
        return result.data[0]

    async def chat(
        self, session_id: str, user_message: str
    ) -> AsyncIterator[str]:
        """Process a chat message and stream interviewer response."""
        # Load session
        session = (
            self._db.table("mock_sessions")
            .select("*, resumes(*, resume_items(*), company_analyses(company_name))")
            .eq("id", session_id)
            .execute()
        )
        if not session.data:
            raise ValueError("세션을 찾을 수 없습니다.")

        s = session.data[0]
        resume = s.get("resumes", {})
        company_name = resume.get("company_analyses", {}).get("company_name", "기업")
        mode = s["mode"]

        # Save user message
        self._db.table("mock_messages").insert({
            "session_id": session_id,
            "role": "candidate",
            "content": user_message,
        }).execute()

        # Load conversation history
        history = (
            self._db.table("mock_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )

        # Build messages for LLM
        system_content = self._prompt.render(
            "interview",
            {
                "company_name": company_name,
                "mode": mode,
                "mode_instruction": MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["normal"]),
            },
            sub_key="mock_interview",
        )

        # Combine system + resume context + history
        messages = []
        if system_content:
            messages.append(system_content[0])  # system message

        resume_items = resume.get("resume_items", [])
        resume_context = "\n".join(
            f"Q: {item['question']}\nA: {item['answer']}" for item in resume_items
        )
        if resume_context:
            messages.append({
                "role": "user",
                "content": f"[지원자 자소서]\n{resume_context}",
            })
            messages.append({
                "role": "assistant",
                "content": "네, 자소서를 확인했습니다. 면접을 시작하겠습니다.",
            })

        # Add conversation history
        for msg in history.data:
            role = "user" if msg["role"] == "candidate" else "assistant"
            messages.append({"role": role, "content": msg["content"]})

        # Stream response
        result = await call_llm(messages, TaskType.mock_interview, stream=True)

        full_response = ""
        async for chunk in result:
            full_response += chunk
            yield chunk

        # Save interviewer response
        self._db.table("mock_messages").insert({
            "session_id": session_id,
            "role": "interviewer",
            "content": full_response,
        }).execute()

    def end_session(self, session_id: str) -> dict:
        """Mark session as completed."""
        result = (
            self._db.table("mock_sessions")
            .update({"status": "completed"})
            .eq("id", session_id)
            .execute()
        )
        return result.data[0]

    def get_session(self, session_id: str) -> dict | None:
        result = (
            self._db.table("mock_sessions")
            .select("*, mock_messages(*)")
            .eq("id", session_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_messages(self, session_id: str) -> list[dict]:
        result = (
            self._db.table("mock_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return result.data

    def get_sessions_for_resume(self, resume_id: str) -> list[dict]:
        """Get all mock sessions for a resume, ordered by date."""
        result = (
            self._db.table("mock_sessions")
            .select("id, resume_id, mode, status, overall_score, evaluation, created_at")
            .eq("resume_id", resume_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data
