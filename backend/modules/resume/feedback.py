"""Feedback engine — 4-axis resume analysis via Claude Sonnet."""

import json

from supabase import create_client

from config.settings import get_settings
from core.llm_router import call_llm, TaskType
from core.prompt_engine import get_prompt_engine


class FeedbackEngine:
    """Analyze resume items on 4 axes: structure, content, expression, strategy."""

    def __init__(self):
        settings = get_settings()
        self._db = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
        self._prompt = get_prompt_engine()

    async def analyze(
        self,
        resume_item_id: str,
        question: str,
        answer: str,
        company_analysis: str | None = None,
    ) -> dict:
        """Run 4-axis analysis and store feedback report."""
        variables = {
            "question": question,
            "answer": answer,
            "company_analysis": company_analysis,
        }
        messages = self._prompt.render("feedback", variables)
        raw = await call_llm(messages, TaskType.feedback, stream=False)
        try:
            analysis = json.loads(raw)
        except json.JSONDecodeError:
            analysis = {"error": "분석 결과 파싱 실패", "raw": raw}

        scores = analysis.get("scores", {})
        row = {
            "resume_item_id": resume_item_id,
            "structure_score": scores.get("structure", 0),
            "content_score": scores.get("content", 0),
            "expression_score": scores.get("expression", 0),
            "strategy_score": scores.get("strategy", 0),
            "analysis": analysis.get("analysis"),
            "suggestions": analysis.get("suggestions"),
            "revised_text": analysis.get("revised_text"),
        }
        result = self._db.table("feedback_reports").insert(row).execute()
        return result.data[0]

    def get_report(self, report_id: str) -> dict | None:
        result = (
            self._db.table("feedback_reports")
            .select("*")
            .eq("id", report_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_reports_for_item(self, resume_item_id: str) -> list[dict]:
        result = (
            self._db.table("feedback_reports")
            .select("*")
            .eq("resume_item_id", resume_item_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    async def apply_suggestion(self, report_id: str) -> dict:
        """Apply revised text from feedback to the resume item."""
        report = self.get_report(report_id)
        if not report or not report.get("revised_text"):
            raise ValueError("수정본이 없는 리포트입니다.")

        item_id = report["resume_item_id"]
        # Get current version
        item = self._db.table("resume_items").select("version").eq("id", item_id).execute()
        current_version = item.data[0]["version"] if item.data else 1

        result = (
            self._db.table("resume_items")
            .update({"answer": report["revised_text"], "version": current_version + 1})
            .eq("id", item_id)
            .execute()
        )
        return result.data[0]
