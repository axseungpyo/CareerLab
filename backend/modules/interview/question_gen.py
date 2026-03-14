"""Interview question generator — Claude Haiku for 5-category questions."""

import json

from supabase import create_client

from config.settings import get_settings
from core.llm_router import call_llm, TaskType
from core.prompt_engine import get_prompt_engine


class QuestionGenerator:
    """Generate interview questions from resume + company analysis."""

    def __init__(self):
        settings = get_settings()
        self._db = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
        self._prompt = get_prompt_engine()

    async def generate(self, resume_id: str) -> list[dict]:
        """Generate questions for a resume and store them."""
        # Load resume + items + company analysis
        resume = (
            self._db.table("resumes")
            .select("*, resume_items(*), company_analyses(*)")
            .eq("id", resume_id)
            .execute()
        )
        if not resume.data:
            raise ValueError("자소서를 찾을 수 없습니다.")

        r = resume.data[0]
        items = r.get("resume_items", [])
        analysis = r.get("company_analyses", {})

        resume_content = "\n\n".join(
            f"Q: {item['question']}\nA: {item['answer']}" for item in items
        )
        company_text = json.dumps(
            {
                "company": analysis.get("company_name", ""),
                "requirements": analysis.get("requirements", []),
                "talent_profile": analysis.get("talent_profile", {}),
            },
            ensure_ascii=False,
        )

        # Load career entries for answer guides
        profile_id = r.get("profile_id")
        entries = (
            self._db.table("career_entries")
            .select("title, content, star_situation, star_action, star_result")
            .eq("profile_id", profile_id)
            .execute()
        )
        entries_text = "\n".join(
            f"- {e['title']}: {e['content']}" for e in (entries.data or [])
        )

        variables = {
            "resume_content": resume_content,
            "company_analysis": company_text,
            "career_entries": entries_text,
        }
        messages = self._prompt.render("interview", variables, sub_key="question_gen")
        raw = await call_llm(messages, TaskType.question_gen, json_mode=False)

        try:
            questions = json.loads(raw)
        except json.JSONDecodeError:
            return []

        # Store questions
        stored = []
        for q in questions:
            row = {
                "resume_id": resume_id,
                "category": q.get("category", "resume_based"),
                "question": q.get("question", ""),
                "answer_guide": q.get("answer_guide"),
                "difficulty": q.get("difficulty", "medium"),
            }
            result = self._db.table("interview_questions").insert(row).execute()
            stored.append(result.data[0])
        return stored

    def get_questions(self, resume_id: str) -> list[dict]:
        result = (
            self._db.table("interview_questions")
            .select("*")
            .eq("resume_id", resume_id)
            .order("created_at")
            .execute()
        )
        return result.data
