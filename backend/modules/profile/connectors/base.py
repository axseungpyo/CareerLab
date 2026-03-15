"""DataConnector — abstract base class for all data connectors."""

import json
from abc import ABC, abstractmethod
from typing import Any

from core.llm_router import call_llm, TaskType

STRUCTURIZE_PROMPT = """아래 이력서/경력 텍스트를 분석하여 JSON으로 구조화하세요.

반드시 아래 형식으로 응답:
{
  "profile": {
    "name": "이름",
    "email": "이메일 (없으면 null)",
    "phone": "연락처 (없으면 null)",
    "education": [{"school": "", "major": "", "degree": "", "period": ""}],
    "summary": "자기소개 요약",
    "career_goal": "커리어 목표 (없으면 null)"
  },
  "career_entries": [
    {
      "entry_type": "career|project|skill|story",
      "title": "직함/프로젝트명",
      "content": "상세 내용",
      "company": "회사명 (없으면 null)",
      "position": "직위 (없으면 null)",
      "period_start": "YYYY-MM-DD (없으면 null)",
      "period_end": "YYYY-MM-DD (없으면 null)",
      "tags": ["관련기술"],
      "star_situation": "상황 (추출 가능시)",
      "star_task": "과제",
      "star_action": "행동",
      "star_result": "결과"
    }
  ]
}"""


class DataConnector(ABC):
    """Base class for all data connectors (file, Notion, etc.)."""

    @abstractmethod
    async def extract_text(self, source: Any) -> str:
        """Extract raw text from source."""
        ...

    @property
    @abstractmethod
    def source_type(self) -> str:
        """Connector type identifier."""
        ...

    async def parse(self, source: Any) -> dict:
        """Extract text → GPT structuring → profile + career_entries."""
        text = await self.extract_text(source)
        if not text.strip():
            return {"error": "텍스트를 추출할 수 없습니다.", "source": self.source_type}

        messages = [
            {"role": "system", "content": STRUCTURIZE_PROMPT},
            {"role": "user", "content": text[:8000]},
        ]
        result = await call_llm(messages, TaskType.file_parsing, json_mode=True)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {"raw_text": text, "parse_error": "구조화 파싱에 실패했습니다."}
