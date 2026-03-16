"""Company analyzer — GPT-4o-mini for deep job posting analysis."""

import json

from supabase import create_client

from config.settings import get_settings
from core.llm_router import call_llm, TaskType
from core.prompt_engine import get_prompt_engine
from core.research import search_company_deep


class CompanyAnalyzer:
    """Analyze job postings with deep research and store results."""

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
        """Analyze job posting with deep web research → store company_analyses row."""

        # Deep search — 3 parallel category queries
        search_results = await search_company_deep(company_name)
        has_search = any(search_results.get(k) for k in ("culture", "news", "hiring"))

        # Build template variables
        variables = {
            "company_name": company_name,
            "industry_hint": None,
            "job_posting_text": job_posting_text,
            "company_info": has_search,
            "company_culture_results": search_results.get("culture", []),
            "company_news_results": search_results.get("news", []),
            "company_hiring_results": search_results.get("hiring", []),
            "research_notes": None,
        }
        messages = self._prompt.render("company_analysis", variables)

        # Call GPT-4o-mini with JSON mode
        raw = await call_llm(messages, TaskType.company_analysis, json_mode=True)
        try:
            analysis = json.loads(raw)
        except json.JSONDecodeError:
            analysis = {}

        # Map v2 schema to DB columns
        talent_profile = analysis.get("talent_profile", {})
        if isinstance(talent_profile, dict):
            # Merge company_overview into talent_profile for richer data
            overview = analysis.get("company_overview", {})
            if overview:
                talent_profile["company_overview"] = overview

        keywords_data = analysis.get("keywords", {})
        if isinstance(keywords_data, dict):
            # Flatten keyword categories into a combined list for DB storage
            flat_keywords = []
            for key in ("must_include", "domain_specific", "action_verbs"):
                flat_keywords.extend(keywords_data.get(key, []))
            keywords_list = flat_keywords
        elif isinstance(keywords_data, list):
            keywords_list = keywords_data
        else:
            keywords_list = []

        requirements_data = analysis.get("requirements", {})
        if isinstance(requirements_data, dict):
            # Flatten requirement categories into a list with prefixes for readability
            flat_reqs = []
            for req in requirements_data.get("essential", []):
                flat_reqs.append(f"[필수] {req}")
            for req in requirements_data.get("preferred", []):
                flat_reqs.append(f"[우대] {req}")
            for req in requirements_data.get("technical_skills", []):
                flat_reqs.append(f"[기술] {req}")
            for req in requirements_data.get("soft_skills", []):
                flat_reqs.append(f"[소프트] {req}")
            for req in requirements_data.get("experience", []):
                flat_reqs.append(f"[경험] {req}")
            for req in requirements_data.get("hidden_requirements", []):
                flat_reqs.append(f"[숨겨진] {req}")
            requirements_list = flat_reqs
        elif isinstance(requirements_data, list):
            requirements_list = requirements_data
        else:
            requirements_list = []

        # Build research_notes from strategy + interview prep
        notes_parts = []
        strategy = analysis.get("resume_strategy", {})
        if isinstance(strategy, dict):
            if strategy.get("key_points"):
                notes_parts.append("## 자소서 핵심 어필 포인트")
                for p in strategy["key_points"]:
                    notes_parts.append(f"- {p}")
            if strategy.get("differentiation"):
                notes_parts.append(f"\n## 차별화 전략\n{strategy['differentiation']}")
            if strategy.get("avoid"):
                notes_parts.append("\n## 피해야 할 표현")
                for a in strategy["avoid"]:
                    notes_parts.append(f"- {a}")
            if strategy.get("tone_recommendation"):
                notes_parts.append(f"\n## 추천 톤앤매너\n{strategy['tone_recommendation']}")
            if strategy.get("storytelling_angle"):
                notes_parts.append(f"\n## 스토리텔링 방향\n{strategy['storytelling_angle']}")

        interview = analysis.get("interview_prep", {})
        if isinstance(interview, dict):
            if interview.get("likely_topics"):
                notes_parts.append("\n## 면접 예상 주제")
                for t in interview["likely_topics"]:
                    notes_parts.append(f"- {t}")
            if interview.get("company_specific"):
                notes_parts.append(f"\n## 기업 특유 면접 특징\n{interview['company_specific']}")

        research_notes = "\n".join(notes_parts) if notes_parts else analysis.get("tips")

        # Combine all search results for company_info storage
        all_search = []
        for category in ("culture", "news", "hiring"):
            for item in search_results.get(category, []):
                item_with_cat = {**item, "category": category}
                all_search.append(item_with_cat)

        # Store in DB
        row = {
            "company_name": company_name,
            "job_posting_text": job_posting_text,
            "job_posting_url": job_posting_url,
            "requirements": requirements_list,
            "talent_profile": talent_profile,
            "keywords": keywords_list,
            "company_info": {"search_results": all_search} if all_search else None,
            "research_notes": research_notes,
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

    def delete_analysis(self, analysis_id: str) -> None:
        """Delete company analysis after checking FK references."""
        refs_resumes = (
            self._db.table("resumes")
            .select("id")
            .eq("company_analysis_id", analysis_id)
            .execute()
        )
        refs_apps = (
            self._db.table("applications")
            .select("id")
            .eq("company_analysis_id", analysis_id)
            .execute()
        )
        if refs_resumes.data or refs_apps.data:
            raise ValueError("이 분석을 참조하는 자소서 또는 지원이 있어 삭제할 수 없습니다.")
        self._db.table("company_analyses").delete().eq("id", analysis_id).execute()
