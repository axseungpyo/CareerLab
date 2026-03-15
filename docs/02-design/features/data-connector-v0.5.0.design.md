# Design: CareerLab v0.5.0 — 데이터 커넥터

> Plan 참조: `docs/01-plan/features/data-connector-v0.5.0.plan.md`

---

## 1. 모듈 구조

```
backend/modules/profile/
  connectors/
    __init__.py          # export: FileConnector, NotionConnector
    base.py              # DataConnector ABC
    file.py              # PDF/DOCX/TXT/MD 파싱
    notion.py            # Notion API 연동
  parser.py              # 기존 유지 (deprecated, FileConnector가 대체)
  models.py              # 기존 Pydantic 모델
  service.py             # 기존 서비스
  repository.py          # 기존 리포지토리
```

---

## 2. DataConnector 추상 클래스

**파일**: `backend/modules/profile/connectors/base.py`

```python
from abc import ABC, abstractmethod
from typing import Any
import json

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
        """Connector type identifier (e.g. 'file', 'notion')."""
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
```

**핵심 설계 결정:**
- `STRUCTURIZE_PROMPT`를 base에 두어 모든 커넥터가 동일한 구조화 프롬프트 사용
- `source_type` 프로퍼티로 에러 메시지에서 소스 식별 가능
- `text[:8000]` 제한은 GPT-4o-mini 컨텍스트 최적화 (비용/속도)

---

## 3. FileConnector 상세

**파일**: `backend/modules/profile/connectors/file.py`

```python
import io
from .base import DataConnector


class FileConnector(DataConnector):
    """Parse uploaded files: PDF, DOCX, TXT, MD."""

    SUPPORTED_EXTENSIONS = {"pdf", "docx", "txt", "md"}

    @property
    def source_type(self) -> str:
        return "file"

    async def extract_text(self, source: tuple[bytes, str]) -> str:
        """source = (file_content_bytes, extension)"""
        content, ext = source
        extractors = {
            "pdf": self._extract_pdf,
            "docx": self._extract_docx,
            "txt": self._extract_plain,
            "md": self._extract_plain,
        }
        extractor = extractors.get(ext)
        if not extractor:
            return ""
        return extractor(content)

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

    def _extract_plain(self, content: bytes) -> str:
        """TXT, MD — decode as UTF-8 with fallback."""
        for encoding in ("utf-8", "cp949", "euc-kr", "latin-1"):
            try:
                return content.decode(encoding)
            except (UnicodeDecodeError, LookupError):
                continue
        return content.decode("utf-8", errors="replace")
```

**설계 포인트:**
- `_extract_plain`에서 한국어 인코딩 자동 감지 (UTF-8 → CP949 → EUC-KR → Latin-1 폴백)
- `SUPPORTED_EXTENSIONS`를 클래스 변수로 두어 라우트에서 검증에 사용
- `source`가 `(bytes, str)` 튜플이라 확장자별 분기 명확

---

## 4. NotionConnector 상세

**파일**: `backend/modules/profile/connectors/notion.py`

```python
import httpx
from .base import DataConnector

NOTION_API_VERSION = "2022-06-28"


class NotionConnector(DataConnector):
    """Fetch and parse Notion pages via Notion API."""

    def __init__(self, api_key: str):
        self._api_key = api_key
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Notion-Version": NOTION_API_VERSION,
            "Content-Type": "application/json",
        }

    @property
    def source_type(self) -> str:
        return "notion"

    async def list_pages(self, query: str = "") -> list[dict]:
        """Search Notion workspace for pages matching query."""
        url = "https://api.notion.com/v1/search"
        payload: dict = {
            "filter": {"property": "object", "value": "page"},
            "page_size": 20,
        }
        if query:
            payload["query"] = query

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, headers=self._headers, json=payload)
            resp.raise_for_status()

        pages = []
        for item in resp.json().get("results", []):
            title = self._extract_title(item)
            pages.append({
                "id": item["id"],
                "title": title or "(제목 없음)",
                "url": item.get("url", ""),
                "icon": self._extract_icon(item),
                "last_edited": item.get("last_edited_time", ""),
            })
        return pages

    async def extract_text(self, source: str) -> str:
        """Fetch all blocks from a Notion page → plain text.
        source = page_id (string)
        """
        page_id = source
        all_texts: list[str] = []
        cursor: str | None = None

        # Paginate through blocks
        while True:
            url = f"https://api.notion.com/v1/blocks/{page_id}/children"
            params: dict = {"page_size": 100}
            if cursor:
                params["start_cursor"] = cursor

            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, headers=self._headers, params=params)
                resp.raise_for_status()

            data = resp.json()
            for block in data.get("results", []):
                text = self._block_to_text(block)
                if text:
                    all_texts.append(text)

            if data.get("has_more"):
                cursor = data.get("next_cursor")
            else:
                break

        return "\n".join(all_texts)

    def _block_to_text(self, block: dict) -> str:
        """Extract plain text from a single Notion block."""
        block_type = block.get("type", "")
        block_data = block.get(block_type, {})

        # Most blocks have rich_text
        rich_texts = block_data.get("rich_text", [])
        text = "".join(rt.get("plain_text", "") for rt in rich_texts)

        # Handle special block types
        if block_type == "heading_1":
            return f"# {text}"
        elif block_type == "heading_2":
            return f"## {text}"
        elif block_type == "heading_3":
            return f"### {text}"
        elif block_type == "bulleted_list_item":
            return f"- {text}"
        elif block_type == "numbered_list_item":
            return f"1. {text}"
        elif block_type == "to_do":
            checked = block_data.get("checked", False)
            return f"[{'x' if checked else ' '}] {text}"
        elif block_type == "divider":
            return "---"

        return text

    def _extract_title(self, page: dict) -> str:
        """Extract page title from properties."""
        for prop in page.get("properties", {}).values():
            if prop.get("type") == "title":
                return "".join(
                    t.get("plain_text", "") for t in prop.get("title", [])
                )
        return ""

    def _extract_icon(self, page: dict) -> str | None:
        """Extract emoji icon from page."""
        icon = page.get("icon")
        if icon and icon.get("type") == "emoji":
            return icon.get("emoji")
        return None
```

**설계 포인트:**
- `list_pages`: 검색 쿼리 지원, 페이지 아이콘(이모지) 포함하여 UI에서 식별 용이
- `extract_text`: 블록 페이지네이션 처리 (`has_more` + `next_cursor`)
- `_block_to_text`: 헤딩/리스트/체크박스 등 Notion 블록 타입별 마크다운 변환
- Notion API 버전 고정 (`2022-06-28`) — 안정적 호환

---

## 5. Settings 모델 변경

**파일**: `backend/core/app_settings.py`에 추가

```python
class NotionSettings(BaseModel):
    """Notion integration settings."""
    enabled: bool = False
    api_key: str = ""
```

**LLMSettings에 추가:**
```python
class LLMSettings(BaseModel):
    claude: ProviderSettings = ...
    openai: ProviderSettings = ...
    search: SearchSettings = ...
    notion: NotionSettings = NotionSettings()    # ← 신규
```

---

## 6. API 엔드포인트 설계

### 6.1 기존 수정: `POST /api/profile/upload`

```python
@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    ext = file.filename.rsplit(".", 1)[-1].lower()

    # 확장자 검증 — FileConnector.SUPPORTED_EXTENSIONS 사용
    from modules.profile.connectors.file import FileConnector
    if ext not in FileConnector.SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 지원: {', '.join(FileConnector.SUPPORTED_EXTENSIONS)}"
        )

    content = await file.read()
    connector = FileConnector()
    result = await connector.parse((content, ext))
    return result
```

### 6.2 신규: `GET /api/profile/import/notion/pages`

```
GET /api/profile/import/notion/pages?query=이력서

응답 200:
[
  {
    "id": "abc-123",
    "title": "내 이력서",
    "url": "https://notion.so/...",
    "icon": "📄",
    "last_edited": "2026-03-15T10:00:00Z"
  }
]

응답 400 (Notion 미설정):
{ "detail": "Notion API Key가 설정되지 않았습니다. /settings에서 설정하세요." }
```

### 6.3 신규: `POST /api/profile/import/notion`

```
POST /api/profile/import/notion
Body: { "page_id": "abc-123" }

응답 200:
{
  "profile": {
    "name": "홍길동",
    "email": "hong@example.com",
    ...
  },
  "career_entries": [
    { "entry_type": "career", "title": "시니어 개발자", ... }
  ]
}
```

---

## 7. 프론트엔드 UI 설계

### 7.1 프로필 페이지 — 파일 업로드 수정

**파일**: `frontend/components/profile/file-upload.tsx` (또는 인라인)

변경:
- accept 속성: `.pdf,.docx,.txt,.md`
- 드래그 영역 문구: "PDF, DOCX, TXT, MD 파일을 드래그하세요"
- 확장자 뱃지에 TXT, MD 추가

### 7.2 프로필 페이지 — Notion 가져오기 섹션

**위치**: 파일 업로드 카드 아래에 새 카드 추가

```
┌─────────────────────────────────────────┐
│  Notion에서 가져오기          [연결됨 ●]  │
│                                          │
│  🔍 [ 검색어 입력...          ] [검색]    │
│                                          │
│  📄 내 이력서         2026-03-15   [ ]    │
│  📋 프로젝트 목록     2026-03-10   [ ]    │
│  💼 경력 정리         2026-03-08   [ ]    │
│                                          │
│           [선택한 페이지 가져오기]          │
└─────────────────────────────────────────┘
```

**상태:**
- Notion 미연결: "Settings에서 Notion API Key를 먼저 설정하세요" + 설정 바로가기 링크
- 연결됨: 검색 + 페이지 목록 + 가져오기 플로우
- 가져오기 중: 스피너 + "Notion 페이지를 분석하고 있습니다..."
- 완료: 결과 미리보기 (profile + career_entries) + "프로필에 반영" 버튼

### 7.3 Settings 페이지 — Notion 카드

**위치**: 웹 검색 카드 아래

```
┌─────────────────────────────────────────┐
│  Notion                   [미설정 ●] 🔘  │
│                                          │
│  ⓘ Notion Internal Integration을 생성하고 │
│    API Key를 입력하세요.                  │
│                                          │
│  API Key  [________________] tvly-...     │
│                                          │
│  💡 notion.so/my-integrations에서        │
│     Internal Integration 생성 후          │
│     페이지에 연결(Connection)하세요.       │
└─────────────────────────────────────────┘
```

---

## 8. 에러 처리

| 상황 | 처리 |
|------|------|
| 지원하지 않는 확장자 | 400 + "지원: pdf, docx, txt, md" |
| 빈 파일 | `{"error": "텍스트를 추출할 수 없습니다."}` |
| 한글 인코딩 깨짐 | UTF-8 → CP949 → EUC-KR → Latin-1 폴백 |
| Notion API Key 미설정 | 400 + "Settings에서 설정하세요" |
| Notion API 인증 실패 (401) | 400 + "Notion API Key가 유효하지 않습니다" |
| Notion 페이지 권한 없음 (403) | 400 + "페이지에 Integration을 연결하세요" |
| Notion API 타임아웃 | 408 + "Notion 서버 응답 시간 초과" |
| GPT 구조화 실패 | `raw_text` + `parse_error` 반환 (원본 텍스트 보존) |

---

## 9. 구현 순서

```
Step 1: DataConnector + FileConnector
  ├─ connectors/base.py
  ├─ connectors/file.py (기존 parser.py 로직 이동)
  ├─ connectors/__init__.py
  └─ profile.py 라우트의 /upload 수정

Step 2: NotionConnector + API
  ├─ connectors/notion.py
  ├─ app_settings.py에 NotionSettings 추가
  ├─ profile.py에 /import/notion/pages, /import/notion 추가
  └─ settings.py에 Notion 상태 체크 추가

Step 3: 프론트엔드
  ├─ profile/page.tsx: 업로드 확장자 확장 + Notion 가져오기 섹션
  └─ settings/page.tsx: Notion 카드 추가

Step 4: 검증
  ├─ TXT/MD 업로드 → 구조화 결과 확인
  ├─ Notion 페이지 목록 → 가져오기 → 구조화 확인
  ├─ 기존 PDF/DOCX 하위호환 확인
  └─ tsc --noEmit + pytest
```

---

## 10. 테스트 계획

```bash
# FileConnector 테스트
echo "홍길동, 시니어 개발자, 5년 경력" > /tmp/test.txt
curl -X POST http://localhost:8000/api/profile/upload -F "file=@/tmp/test.txt"

# MD 파일 테스트
echo "# 이력서\n## 경력\n- 회사A (2020-2023)" > /tmp/test.md
curl -X POST http://localhost:8000/api/profile/upload -F "file=@/tmp/test.md"

# Notion 연동 테스트
curl "http://localhost:8000/api/profile/import/notion/pages?query=이력서"
curl -X POST http://localhost:8000/api/profile/import/notion \
  -H "Content-Type: application/json" \
  -d '{"page_id": "xxx"}'

# 기존 호환성
curl -X POST http://localhost:8000/api/profile/upload -F "file=@resume.pdf"

# 전체 검증
cd frontend && npx tsc --noEmit
cd backend && python -m pytest tests/ -v
```
