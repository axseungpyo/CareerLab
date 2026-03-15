# Plan: CareerLab v0.5.0 — 데이터 커넥터 (멀티 포맷 + Notion 연동)

> 사용자의 이력서/경력 데이터를 어떤 형식이든 쉽게 가져올 수 있는 통합 데이터 수집 레이어.

---

## User Intent Discovery

### 핵심 문제
현재 PDF/DOCX만 지원하여 TXT, Markdown으로 작성된 이력서나 Notion에 정리해둔 경력 데이터를 가져올 수 없음.
사용자의 **데이터 진입장벽을 낮추고**, 이미 다른 곳에 작성해둔 데이터를 **자동으로 수집**하는 기능이 필요.

### 대상 사용자
본인 전용 (단일 사용자). Notion 개인 워크스페이스에서 경력/프로젝트 데이터를 관리하는 패턴.

### 성공 기준
1. TXT, MD 파일을 업로드하면 PDF/DOCX와 동일하게 프로필+경력으로 구조화
2. Notion 페이지를 선택하면 내용을 가져와서 프로필+경력으로 구조화
3. 기존 PDF/DOCX 파싱이 깨지지 않음 (하위호환)
4. 추후 Google Docs, LinkedIn 등 확장 가능한 구조

---

## Alternatives Explored

| 접근법 | 설명 | 채택 |
|--------|------|------|
| **통합 커넥터 레이어** | DataConnector 추상화로 파일/앱을 동일 인터페이스로 처리 | **채택** |
| 파일만 확장 + Notion 별도 | parser.py에 포맷만 추가, Notion은 독립 페이지 | 보류 |

**채택 이유**: 추후 Google Docs, LinkedIn, HWP 등 확장 시 동일 패턴으로 추가 가능.

---

## YAGNI Review

### In Scope (v0.5.0)
- [x] DataConnector 추상화 레이어 (base class + extract → parse 파이프라인)
- [x] TXT 파일 파싱
- [x] Markdown 파일 파싱
- [x] Notion 페이지 가져오기 (API 연동 + 페이지 선택 + 텍스트 추출)
- [x] 업로드 허용 확장자 추가 (txt, md)
- [x] Settings에 Notion API Key 입력 UI

### Out of Scope (v0.6.0+)
- [ ] HWP/HWPX 파싱 (hwpx 라이브러리 의존성 검토 필요)
- [ ] Google Docs 연동 (Google OAuth 복잡도)
- [ ] LinkedIn 프로필 가져오기 (스크래핑 제한)
- [ ] 자동 동기화 (Notion 변경 감지 → 자동 업데이트)
- [ ] 이미지/표 추출 (현재 텍스트만)

---

## 아키텍처

### 디렉토리 구조

```
backend/modules/profile/
  connectors/
    __init__.py
    base.py          ← DataConnector 추상 클래스
    file.py          ← FileConnector (PDF/DOCX/TXT/MD)
    notion.py        ← NotionConnector (Notion API)
  parser.py          ← 기존 유지 (FileConnector에서 호출) → 점진적 마이그레이션
```

### DataConnector 추상화

```python
# base.py
from abc import ABC, abstractmethod

class DataConnector(ABC):
    """Base class for all data connectors."""

    @abstractmethod
    async def extract_text(self, source: Any) -> str:
        """Extract raw text from source (file bytes, API response, etc.)."""
        ...

    async def parse(self, source: Any) -> dict:
        """Extract text → GPT structuring → profile + career_entries."""
        text = await self.extract_text(source)
        if not text.strip():
            return {"error": "텍스트를 추출할 수 없습니다."}
        return await self._structurize(text)

    async def _structurize(self, text: str) -> dict:
        """Send raw text to GPT for structured extraction."""
        # 기존 parser.py의 PARSE_PROMPT + call_llm 로직 재사용
        ...
```

### FileConnector

```python
# file.py
class FileConnector(DataConnector):
    """Parse uploaded files: PDF, DOCX, TXT, MD."""

    SUPPORTED = {"pdf", "docx", "txt", "md"}

    async def extract_text(self, source: tuple[bytes, str]) -> str:
        content, ext = source
        if ext == "pdf":
            return self._extract_pdf(content)
        elif ext == "docx":
            return self._extract_docx(content)
        elif ext in ("txt", "md"):
            return content.decode("utf-8", errors="replace")
        return ""

    # _extract_pdf, _extract_docx는 기존 parser.py에서 이동
```

### NotionConnector

```python
# notion.py
import httpx

class NotionConnector(DataConnector):
    """Fetch and parse Notion pages."""

    def __init__(self, api_key: str):
        self._api_key = api_key
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }

    async def list_pages(self, query: str = "") -> list[dict]:
        """Search Notion pages by title."""
        url = "https://api.notion.com/v1/search"
        payload = {"query": query, "filter": {"property": "object", "value": "page"}}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, headers=self._headers, json=payload)
            resp.raise_for_status()
        pages = []
        for item in resp.json().get("results", []):
            title = ""
            for prop in item.get("properties", {}).values():
                if prop.get("type") == "title":
                    title = "".join(
                        t.get("plain_text", "") for t in prop.get("title", [])
                    )
                    break
            pages.append({
                "id": item["id"],
                "title": title or "(제목 없음)",
                "url": item.get("url", ""),
                "last_edited": item.get("last_edited_time", ""),
            })
        return pages

    async def extract_text(self, source: str) -> str:
        """Fetch all blocks from a Notion page and extract plain text."""
        page_id = source
        url = f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=self._headers)
            resp.raise_for_status()
        blocks = resp.json().get("results", [])
        texts = []
        for block in blocks:
            block_type = block.get("type", "")
            rich_texts = block.get(block_type, {}).get("rich_text", [])
            line = "".join(rt.get("plain_text", "") for rt in rich_texts)
            if line:
                texts.append(line)
        return "\n".join(texts)
```

---

## API 엔드포인트

### 기존 수정

```
POST /api/profile/upload
  - 허용 확장자: pdf, docx, txt, md (기존: pdf, docx만)
  - FileConnector 사용으로 변경
```

### 신규 추가

```
GET  /api/profile/import/notion/pages?query=
  - Notion 페이지 검색/목록
  - 응답: [{ id, title, url, last_edited }]

POST /api/profile/import/notion
  - Body: { page_id: string }
  - 선택한 페이지의 텍스트 추출 → GPT 구조화 → 프로필+경력 반환
  - 응답: 기존 /upload과 동일한 형식 (profile + career_entries)
```

### Settings 추가

```
app_settings.json에 추가:
{
  "llm": {
    ...
    "notion": {
      "enabled": false,
      "api_key": ""
    }
  }
}
```

---

## 프론트엔드

### 프로필 페이지 변경 (`/profile`)

**파일 업로드 컴포넌트 수정:**
- 허용 확장자: `.pdf, .docx, .txt, .md`
- 드래그앤드롭 영역 문구: "PDF, DOCX, TXT, MD 파일을 드래그하세요"

**Notion 가져오기 섹션 추가:**
```
[Notion에서 가져오기] 버튼
  ↓ (클릭)
검색 입력란 + 페이지 목록 (체크박스)
  ↓ (선택 후 "가져오기" 클릭)
GPT 구조화 진행 → 결과 미리보기 → 프로필에 반영
```

### Settings 페이지 변경

**연결 탭에 Notion 카드 추가:**
- Enable/Disable 토글
- API Key (Internal Integration Token) 입력
- 상태 표시 (연결됨/미설정)
- "Notion Internal Integration 생성 가이드" 링크

---

## 데이터 플로우

```
┌──────────────────────────────────────────────────┐
│  사용자 입력                                       │
│                                                    │
│  ① 파일 업로드 (PDF/DOCX/TXT/MD)                   │
│  ② Notion 페이지 선택                              │
│  ③ (추후) Google Docs, LinkedIn 등                  │
└──────────┬──────────────────────┬────────────────┘
           │                      │
    FileConnector          NotionConnector
           │                      │
           └──────────┬───────────┘
                      │
              DataConnector.parse()
                      │
              extract_text() → raw text
                      │
              _structurize() → GPT-4o-mini
                      │
              { profile, career_entries }
                      │
              프론트엔드 미리보기 → 저장
```

---

## 수정 대상 파일

### 신규 생성
| 파일 | 용도 |
|------|------|
| `backend/modules/profile/connectors/__init__.py` | 패키지 |
| `backend/modules/profile/connectors/base.py` | DataConnector 추상 클래스 |
| `backend/modules/profile/connectors/file.py` | FileConnector (PDF/DOCX/TXT/MD) |
| `backend/modules/profile/connectors/notion.py` | NotionConnector (Notion API) |

### 주요 수정
| 파일 | 변경 |
|------|------|
| `backend/api/routes/profile.py` | upload 확장자 추가, Notion import 엔드포인트 2개 추가 |
| `backend/core/app_settings.py` | NotionSettings 모델 추가 |
| `backend/api/routes/settings.py` | Notion 상태 체크 + 마스킹 |
| `frontend/app/profile/page.tsx` | 업로드 확장자 확대 + Notion 가져오기 UI |
| `frontend/app/settings/page.tsx` | Notion 연결 카드 추가 |

### 기존 유지 (하위호환)
| 파일 | 상태 |
|------|------|
| `backend/modules/profile/parser.py` | 유지 — FileConnector가 내부적으로 로직 재사용 |

---

## Brainstorming Log

| Phase | 질문 | 결정 |
|-------|------|------|
| Intent | 핵심 문제 | 파일 포맷 확장 + 외부 앱 연동 모두 |
| Intent | 외부 앱 | Notion 우선, 확장 가능 구조 |
| Alternatives | 구현 접근법 | 통합 커넥터 레이어 (DataConnector 추상화) |
| YAGNI | v0.5.0 스코프 | TXT/MD + Notion + 추상화 (HWP 보류) |
| Validation | 아키텍처 | DataConnector → FileConnector/NotionConnector 승인 |

---

## 검증

```bash
# 파일 파싱 검증
curl -X POST http://localhost:8000/api/profile/upload \
  -F "file=@test_resume.txt"
# → { "profile": {...}, "career_entries": [...] }

curl -X POST http://localhost:8000/api/profile/upload \
  -F "file=@test_resume.md"
# → 동일 구조 응답

# Notion 연동 검증
curl http://localhost:8000/api/profile/import/notion/pages?query=이력서
# → [{ "id": "...", "title": "내 이력서", ... }]

curl -X POST http://localhost:8000/api/profile/import/notion \
  -H "Content-Type: application/json" \
  -d '{"page_id": "xxx"}'
# → { "profile": {...}, "career_entries": [...] }

# 기존 호환성
curl -X POST http://localhost:8000/api/profile/upload \
  -F "file=@test_resume.pdf"
# → 기존과 동일하게 동작

# 타입체크 + 테스트
cd frontend && npx tsc --noEmit
cd backend && python -m pytest tests/ -v
```

---

## 일정

| 단계 | 기간 | 작업 |
|------|------|------|
| Step 1 | 0.5일 | DataConnector 추상화 + FileConnector (TXT/MD 추가) |
| Step 2 | 1일 | NotionConnector + API 엔드포인트 |
| Step 3 | 0.5일 | Settings에 Notion 설정 + 상태 체크 |
| Step 4 | 1일 | 프론트엔드 UI (업로드 확장 + Notion 가져오기) |
| **합계** | **3일** | |
