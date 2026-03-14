"""Resume file parser — PDF/DOCX → GPT-4o-mini structured extraction."""

import json
import io

from core.llm_router import call_llm, TaskType


PARSE_PROMPT = """아래 이력서 텍스트를 분석하여 JSON으로 구조화하세요.

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


class ResumeParser:
    """Parse PDF/DOCX resume files into structured profile data."""

    async def parse(self, content: bytes, ext: str) -> dict:
        text = self._extract_text(content, ext)
        if not text.strip():
            return {"error": "파일에서 텍스트를 추출할 수 없습니다."}

        messages = [
            {"role": "system", "content": PARSE_PROMPT},
            {"role": "user", "content": text[:8000]},
        ]
        result = await call_llm(messages, TaskType.file_parsing, json_mode=True)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {"raw_text": text, "parse_error": "구조화 파싱에 실패했습니다."}

    def _extract_text(self, content: bytes, ext: str) -> str:
        if ext == "pdf":
            return self._extract_pdf(content)
        elif ext == "docx":
            return self._extract_docx(content)
        return ""

    def _extract_pdf(self, content: bytes) -> str:
        import pdfplumber
        pages = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n\n".join(pages)

    def _extract_docx(self, content: bytes) -> str:
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
