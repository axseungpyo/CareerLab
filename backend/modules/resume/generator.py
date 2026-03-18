"""Resume generator — semantic matching + Claude streaming generation."""

import json
from typing import AsyncIterator

from supabase import create_client

from config.settings import get_settings
from core.embedding import get_embedding_engine
from core.llm_router import call_llm, TaskType
from core.prompt_engine import get_prompt_engine
from modules.resume.analyzer import CompanyAnalyzer


class ResumeGenerator:
    """Generate resume answers: company analysis → pgvector match → Claude stream."""

    def __init__(self):
        settings = get_settings()
        self._db = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
        self._embedding = get_embedding_engine()
        self._prompt = get_prompt_engine()
        self._analyzer = CompanyAnalyzer()

    async def generate(
        self,
        profile_id: str,
        company_analysis_id: str,
        question: str,
        char_limit: int | None = None,
        tone: str = "전문적",
        emphasis: str | None = None,
        stream: bool = True,
    ) -> str | AsyncIterator[str]:
        """Generate a resume answer via Claude streaming."""
        # 1. Load company analysis
        analysis = self._analyzer.get_analysis(company_analysis_id)
        if not analysis:
            raise ValueError("기업 분석 데이터를 찾을 수 없습니다.")

        # 2. Semantic search for matching career entries (skip if embedding unavailable)
        try:
            search_query = f"{question} {' '.join(analysis.get('keywords', []))}"
            matched = await self._embedding.semantic_search(search_query, profile_id)
        except Exception:
            matched = []
        matched_text = self._format_entries(matched)

        # 3. Render prompt
        company_summary = json.dumps(
            {
                "company": analysis.get("company_name"),
                "requirements": analysis.get("requirements"),
                "talent_profile": analysis.get("talent_profile"),
                "keywords": analysis.get("keywords"),
            },
            ensure_ascii=False,
        )
        # 5. Load research context if available
        research_context = self._load_research(analysis.get("company_name", ""))

        variables = {
            "company_analysis": company_summary,
            "matched_entries": matched_text,
            "question": question,
            "tone": tone,
            "char_limit": str(char_limit) if char_limit else "없음",
            "emphasis": emphasis or "자동 선택",
            "research_context": research_context or "",
        }
        messages = self._prompt.render("resume_gen", variables)

        # 4. Call Claude
        return await call_llm(messages, TaskType.resume_gen, stream=stream)

    def _load_research(self, company_name: str) -> str | None:
        """Load research files matching the company name."""
        from pathlib import Path
        research_dir = Path.home() / "Documents" / "career" / "research"
        if not research_dir.exists() or not company_name:
            return None

        parts = []
        for f in research_dir.glob("*.md"):
            if company_name.lower() in f.name.lower():
                try:
                    content = f.read_text(encoding="utf-8")
                    parts.append(f"## {f.name}\n{content[:2000]}")
                except Exception:
                    continue
        return "\n\n".join(parts) if parts else None

    def _format_entries(self, entries: list[dict]) -> str:
        if not entries:
            return "매칭된 경력 없음"
        parts = []
        for i, e in enumerate(entries, 1):
            part = f"[{i}] {e.get('title', '')}\n{e.get('content', '')}"
            if e.get("star_situation"):
                part += f"\n상황: {e['star_situation']}"
            if e.get("star_action"):
                part += f"\n행동: {e['star_action']}"
            if e.get("star_result"):
                part += f"\n결과: {e['star_result']}"
            parts.append(part)
        return "\n\n".join(parts)

    # ── CRUD helpers ──

    def create_resume(self, data: dict) -> dict:
        result = self._db.table("resumes").insert(data).execute()
        return result.data[0]

    def get_resumes(self, profile_id: str | None = None) -> list[dict]:
        query = self._db.table("resumes").select("*, company_analyses(company_name)")
        if profile_id:
            query = query.eq("profile_id", profile_id)
        result = query.order("created_at", desc=True).execute()
        return result.data

    def get_resume(self, resume_id: str) -> dict | None:
        result = (
            self._db.table("resumes")
            .select("*, resume_items(*), company_analyses(*)")
            .eq("id", resume_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def update_resume_status(self, resume_id: str, status: str, **kwargs) -> dict:
        payload = {"status": status, **kwargs}
        result = (
            self._db.table("resumes")
            .update(payload)
            .eq("id", resume_id)
            .execute()
        )
        return result.data[0]

    def create_resume_item(self, data: dict) -> dict:
        result = self._db.table("resume_items").insert(data).execute()
        return result.data[0]

    def update_resume_item(self, item_id: str, data: dict) -> dict:
        result = (
            self._db.table("resume_items")
            .update(data)
            .eq("id", item_id)
            .execute()
        )
        return result.data[0]

    def get_resume_items(self, resume_id: str) -> list[dict]:
        result = (
            self._db.table("resume_items")
            .select("*")
            .eq("resume_id", resume_id)
            .order("created_at")
            .execute()
        )
        return result.data

    def get_item_versions(self, resume_id: str, question: str) -> list[dict]:
        """Get all versions of a resume item with the same question."""
        result = (
            self._db.table("resume_items")
            .select("*")
            .eq("resume_id", resume_id)
            .eq("question", question)
            .order("version")
            .execute()
        )
        return result.data
