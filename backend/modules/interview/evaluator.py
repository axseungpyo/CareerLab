"""Interview evaluator — analyzes full mock session and produces scored feedback."""

import json

from supabase import create_client

from config.settings import get_settings
from core.llm_router import call_llm, TaskType


EVALUATION_SYSTEM = """당신은 면접 평가 전문가입니다.
모의면접 전체 대화를 분석하여 구조화된 평가를 제공합니다.

평가 항목:
1. 답변 충실도 (1~10): 질문 의도 파악, 구체적 사례 제시
2. 논리성 (1~10): 답변 구조, 일관성
3. 전문성 (1~10): 직무 관련 지식, 경험 활용
4. 소통력 (1~10): 표현력, 설득력
5. 대응력 (1~10): 돌발/압박 질문 대응

JSON으로 응답:
{
  "overall_score": 1~100,
  "grade": "S|A|B|C|D",
  "scores": {
    "answer_quality": 1~10,
    "logic": 1~10,
    "expertise": 1~10,
    "communication": 1~10,
    "adaptability": 1~10
  },
  "strengths": ["강점1", "강점2"],
  "weaknesses": ["약점1", "약점2"],
  "answer_feedback": [
    {
      "question": "면접관 질문",
      "candidate_answer": "지원자 답변 요약",
      "score": 1~10,
      "feedback": "피드백",
      "model_answer": "모범 답변"
    }
  ],
  "overall_feedback": "종합 평가 코멘트"
}"""


class InterviewEvaluator:
    """Evaluate a completed mock interview session."""

    def __init__(self):
        settings = get_settings()
        self._db = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    async def evaluate(self, session_id: str) -> dict:
        """Analyze full conversation and produce evaluation."""
        # Load session messages
        messages_result = (
            self._db.table("mock_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        if not messages_result.data:
            raise ValueError("대화 기록이 없습니다.")

        conversation = "\n\n".join(
            f"{'면접관' if m['role'] == 'interviewer' else '지원자'}: {m['content']}"
            for m in messages_result.data
        )

        llm_messages = [
            {"role": "system", "content": EVALUATION_SYSTEM},
            {"role": "user", "content": f"다음 모의면접 대화를 평가해주세요:\n\n{conversation}"},
        ]

        raw = await call_llm(llm_messages, TaskType.feedback, stream=False)
        evaluation = self._parse_json(raw)

        # Update session
        self._db.table("mock_sessions").update({
            "status": "completed",
            "overall_score": evaluation.get("overall_score", 0),
            "evaluation": evaluation,
        }).eq("id", session_id).execute()

        # Update individual message scores
        for fb in evaluation.get("answer_feedback", []):
            # Find matching interviewer message for score
            pass  # scores stored in evaluation JSON

        return {"session_id": session_id, **evaluation}

    @staticmethod
    def _parse_json(raw: str) -> dict:
        """Parse JSON from LLM response, handling markdown code fences."""
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                pass
        return {"overall_score": 0, "error": "평가 파싱 실패"}
