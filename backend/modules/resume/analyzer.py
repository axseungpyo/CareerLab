"""Company analyzer — GPT-4o-mini for job posting analysis."""

import json

from supabase import create_client

from config.settings import get_settings
from core.llm_router import call_llm, TaskType
from core.prompt_engine import get_prompt_engine
from core.research import search_company


class CompanyAnalyzer:
    """Analyze job postings and store results."""

    def __init__(self):
        settings = get_settings()
        self._db = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
        self._prompt = get_prompt_engine()

    async def analyze(
        self,
        company_name: str,
        job_posting_text: str,
        job_posting_url: str | None = None,
    ) -> dict:
        """Analyze job posting → store company_analyses row."""
        # Optionally enrich with Brave Search
        search_results = await search_company(company_name)
        company_info_text = ""
        if search_results:
            company_info_text = "\n".join(
                f"- {r['title']}: {r['description']}" for r in search_results
            )

        # Render prompt
        variables = {
            "job_posting_text": job_posting_text,
            "company_info": company_info_text or None,
        }
        messages = self._prompt.render("company_analysis", variables)

        # Call GPT-4o-mini
        raw = await call_llm(messages, TaskType.company_analysis, json_mode=True)
        try:
            analysis = json.loads(raw)
        except json.JSONDecodeError:
            analysis = {}

        # Store in DB
        row = {
            "company_name": company_name,
            "job_posting_text": job_posting_text,
            "job_posting_url": job_posting_url,
            "requirements": analysis.get("requirements"),
            "talent_profile": analysis.get("talent_profile"),
            "keywords": analysis.get("keywords"),
            "company_info": {"search_results": search_results} if search_results else None,
            "research_notes": analysis.get("tips"),
        }
        result = self._db.table("company_analyses").insert(row).execute()
        stored = result.data[0]
        stored["analysis"] = analysis
        return stored

    def get_analysis(self, analysis_id: str) -> dict | None:
        result = (
            self._db.table("company_analyses")
            .select("*")
            .eq("id", analysis_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_analyses(self) -> list[dict]:
        result = (
            self._db.table("company_analyses")
            .select("*")
            .order("analyzed_at", desc=True)
            .execute()
        )
        return result.data
