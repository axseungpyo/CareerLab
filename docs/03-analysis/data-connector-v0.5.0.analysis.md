# data-connector-v0.5.0 Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation) -- Re-analysis after iteration fixes
>
> **Project**: CareerLab
> **Version**: 0.5.0
> **Analyst**: gap-detector
> **Date**: 2026-03-16
> **Design Doc**: [data-connector-v0.5.0.design.md](../02-design/features/data-connector-v0.5.0.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Design document(Section 1-8)와 실제 구현 코드 간의 일치율을 재검증한다.
이전 분석(v0.1, Match Rate 82%)에서 식별된 5개 Gap에 대한 수정 반영 여부를 확인한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/data-connector-v0.5.0.design.md`
- **Implementation Paths**:
  - `backend/modules/profile/connectors/` (base.py, file.py, notion.py, __init__.py)
  - `backend/api/routes/profile.py`
  - `backend/core/app_settings.py`
  - `backend/api/routes/settings.py`
  - `frontend/app/settings/page.tsx`
  - `frontend/app/profile/page.tsx`
  - `frontend/components/profile/file-upload.tsx`
- **Analysis Date**: 2026-03-16
- **Previous Analysis**: v0.1 (2026-03-16, Match Rate 82%)

---

## 2. Overall Scores

| Category | Previous | Current | Status |
|----------|:--------:|:-------:|:------:|
| Design Match (Backend) | 98% | 99% | ✅ |
| Design Match (Frontend) | 37.5% | 94% | ✅ |
| Architecture Compliance | 100% | 100% | ✅ |
| Convention Compliance | 95% | 95% | ✅ |
| **Overall** | **82%** | **97%** | ✅ |

---

## 3. Previous Gap Resolution Status

### 3.1 Gap #1: FileUpload accept attribute -- RESOLVED

| Item | Previous | Current | Status |
|------|----------|---------|--------|
| `input.accept = ".pdf,.docx,.txt,.md"` | `".pdf,.docx"` only | `".pdf,.docx,.txt,.md"` (L76) | ✅ Fixed |
| Client validation includes txt, md | `pdf/docx` only | `["pdf", "docx", "txt", "md"].includes(ext)` (L21) | ✅ Fixed |
| Display text mentions TXT, MD | `"PDF, DOCX 지원"` | `"PDF, DOCX, TXT, MD 지원"` (L67) | ✅ Fixed |

### 3.2 Gap #2: Notion Import UI -- MOSTLY RESOLVED

| Item | Previous | Current | Status |
|------|----------|---------|--------|
| Notion import card below file upload | Not present | Card with `FileText` icon + "Notion에서 가져오기" title (L172-271) | ✅ Fixed |
| Search input for Notion pages | Not implemented | Input + Search button with Enter key support (L194-210) | ✅ Fixed |
| Page list with icons and dates | Not implemented | Scrollable list with emoji icons, titles, dates, external links (L213-248) | ✅ Fixed |
| "선택한 페이지 가져오기" button | Not implemented | Conditional button with loading state (L251-259) | ✅ Fixed |
| Notion 미연결 fallback message | Not implemented | Link to /settings with guidance text (L262-268) | ✅ Fixed |
| Loading states | Not implemented | `notionSearching` + `notionImporting` states (L41-42) | ✅ Fixed |
| Result preview with "프로필에 반영" button | Not implemented | Toast + console.log only, no structured preview UI | ⚠️ Partial |

**Note on partial item**: Design Section 7.2 specifies "완료: 결과 미리보기 (profile + career_entries) + '프로필에 반영' 버튼". Current implementation shows a success toast and logs parsed data to console (L145-149), but does not render a structured preview with a dedicated "프로필에 반영" action button. This is a minor UI completeness gap -- the core data flow (search -> select -> import -> parse) is fully functional.

### 3.3 Gap #3: Notion Timeout Error Handling -- RESOLVED

| Item | Previous | Current | Status |
|------|----------|---------|--------|
| `httpx.TimeoutException` -> 408 response | Falls to 500 fallback | `_raise_notion_error`: `isinstance(e, httpx.TimeoutException)` -> 408 (L155-156) | ✅ Fixed |

---

## 4. Gap Analysis by Design Section

### 4.1 Section 1 -- Module Structure

| Design Item | Implementation | Status |
|-------------|---------------|--------|
| `connectors/__init__.py` exports FileConnector, NotionConnector | `from .file import FileConnector` + `from .notion import NotionConnector` + `__all__` | ✅ Match |
| `connectors/base.py` -- DataConnector ABC | Exists, complete | ✅ Match |
| `connectors/file.py` -- FileConnector | Exists, complete | ✅ Match |
| `connectors/notion.py` -- NotionConnector | Exists, complete | ✅ Match |

**Score: 100%** (4/4 items match)

---

### 4.2 Section 2 -- DataConnector Base Class

| Design Item | Implementation | Status |
|-------------|---------------|--------|
| `STRUCTURIZE_PROMPT` constant (exact text) | Identical | ✅ Match |
| `DataConnector(ABC)` class | Identical | ✅ Match |
| `extract_text(source: Any) -> str` abstractmethod | Identical | ✅ Match |
| `source_type` property abstractmethod | Identical (docstring slightly shorter) | ✅ Match |
| `parse(source: Any) -> dict` method | Identical logic | ✅ Match |
| Empty text returns `{"error": ..., "source": ...}` | Identical | ✅ Match |
| `text[:8000]` truncation | Identical | ✅ Match |
| `json.loads` with fallback `raw_text` + `parse_error` | Identical | ✅ Match |

**Score: 100%** (8/8 items match)

---

### 4.3 Section 3 -- FileConnector

| Design Item | Implementation | Status |
|-------------|---------------|--------|
| `SUPPORTED_EXTENSIONS = {"pdf", "docx", "txt", "md"}` | Identical | ✅ Match |
| `source_type` returns `"file"` | Identical | ✅ Match |
| `extract_text(source: tuple[bytes, str])` | Design: `tuple[bytes, str]`, impl: `Any` (same destructure) | ⚠️ Minor |
| `_extract_pdf` with pdfplumber | Identical | ✅ Match |
| `_extract_docx` with python-docx | Identical | ✅ Match |
| `_extract_plain` Korean encoding fallback | Identical: UTF-8 -> CP949 -> EUC-KR -> Latin-1 | ✅ Match |
| Extractor dispatch dict pattern | Identical | ✅ Match |

**Score: 96%** (6.75/7 items -- minor type hint variance)

---

### 4.4 Section 4 -- NotionConnector

| Design Item | Implementation | Status |
|-------------|---------------|--------|
| `NOTION_API_VERSION = "2022-06-28"` | Identical | ✅ Match |
| `__init__(api_key: str)` with headers | Identical | ✅ Match |
| `source_type` returns `"notion"` | Identical | ✅ Match |
| `list_pages(query: str = "")` | Identical | ✅ Match |
| Search payload: filter page, page_size 20, conditional query | Identical | ✅ Match |
| Response fields: id, title, url, icon, last_edited | Identical | ✅ Match |
| `"(제목 없음)"` fallback title | Identical | ✅ Match |
| `extract_text(source: str)` -- page_id based | Design: `source: str`, impl: `source: Any` | ⚠️ Minor |
| Block pagination: `has_more` + `next_cursor` loop | Identical | ✅ Match |
| `_block_to_text` -- heading/list/todo/divider | Identical | ✅ Match |
| `_extract_title` from properties | Identical | ✅ Match |
| `_extract_icon` emoji extraction | Identical | ✅ Match |

**Score: 98%** (11.75/12 items)

---

### 4.5 Section 5 -- Settings Model (NotionSettings)

| Design Item | Implementation | Status |
|-------------|---------------|--------|
| `NotionSettings(BaseModel)` with `enabled: bool = False`, `api_key: str = ""` | Identical | ✅ Match |
| `LLMSettings.notion: NotionSettings = NotionSettings()` | Identical | ✅ Match |

**Score: 100%** (2/2 items match)

---

### 4.6 Section 6 -- API Endpoints

| Design Endpoint | Implementation | Status | Notes |
|-----------------|---------------|--------|-------|
| `POST /upload` expanded with FileConnector | `profile.py` L83-100 | ✅ Match | Uses `FileConnector.SUPPORTED_EXTENSIONS` |
| Extension validation error message | Design: `"지원: {exts}"` / Impl: `"지원: {sorted(exts)}"` | ⚠️ Minor | Sorted extensions (cosmetic) |
| `GET /import/notion/pages?query=` | `profile.py` L105-123 | ✅ Match | |
| Notion 미설정 400 error | Identical message | ✅ Match | |
| 401 -> "API Key 유효하지 않습니다" | Identical | ✅ Match | |
| 403 -> "Integration을 연결하세요" | Impl adds "(Connection)" | ⚠️ Minor | |
| `POST /import/notion` with `page_id` body | `profile.py` L130-148 | ✅ Match | |
| `NotionImportRequest(BaseModel)` | Implemented | ✅ Match | Needed addition |
| 404 error for page not found | Implemented (not in design) | ⚠️ Added | Good addition |

**Score: 92%** (8.5/9.25 items)

---

### 4.7 Section 7 -- Frontend UI

#### 7.1 Settings Page -- Notion Card

| Design Item | Implementation | Status |
|-------------|---------------|--------|
| Notion card in settings page | `settings/page.tsx` | ✅ Match |
| Status dot (연결 상태) | StatusDot component | ✅ Match |
| Enable/disable toggle | Toggle component | ✅ Match |
| API Key input with masking | Input with `api_key_masked` | ✅ Match |
| notion.so/my-integrations link | Link with `target="_blank"` | ✅ Match |
| Help text about Connection | Present | ✅ Match |

**Settings Notion Card Score: 100%** (6/6)

#### 7.2 File Upload Component -- Extension Expansion

| Design Item | Implementation | Status |
|-------------|---------------|--------|
| accept: `.pdf,.docx,.txt,.md` | `file-upload.tsx` L76: `.pdf,.docx,.txt,.md` | ✅ Match |
| Display text: "PDF, DOCX, TXT, MD" | L67: `"PDF, DOCX, TXT, MD 지원"` | ✅ Match |
| Validation includes txt, md | L21: `["pdf", "docx", "txt", "md"].includes(ext)` | ✅ Match |

**File Upload Expansion Score: 100%** (3/3) -- Previously 0%

#### 7.3 Profile Page -- Notion Import Section

| Design Item | Implementation | Status |
|-------------|---------------|--------|
| Notion import card below file upload | `profile/page.tsx` L172-271, Card component | ✅ Match |
| Search input for Notion pages | Input with placeholder + Enter key (L195-201) | ✅ Match |
| Page list with icons and dates | Scrollable list: emoji icon, title, date, external link (L213-248) | ✅ Match |
| "선택한 페이지 가져오기" button | Conditional button (L251-259) | ✅ Match |
| Notion 미연결 fallback message | Link to /settings + guidance text (L262-268) | ✅ Match |
| Loading states | `notionSearching` (search button), `notionImporting` (import button) | ✅ Match |
| Result preview + "프로필에 반영" button | Toast + console.log only, no structured preview UI | ⚠️ Partial |

**Notion Import UI Score: 93%** (6.5/7) -- Previously 0%

**Frontend Overall Score: 15.5/16 = 96.9%** -- Previously 37.5%

---

### 4.8 Section 8 -- Error Handling

| Error Scenario | Design | Implementation | Status |
|----------------|--------|----------------|--------|
| 지원하지 않는 확장자 | 400 + "지원: pdf, docx, txt, md" | Backend: 400 + sorted extensions | ✅ Match |
| 빈 파일 | `{"error": "텍스트를 추출할 수 없습니다."}` | base.py L58 | ✅ Match |
| 한글 인코딩 깨짐 | UTF-8 -> CP949 -> EUC-KR -> Latin-1 | file.py L49 | ✅ Match |
| Notion API Key 미설정 | 400 + "Settings에서 설정하세요" | profile.py L113-114 | ✅ Match |
| Notion 인증 실패 (401) | 400 + "API Key가 유효하지 않습니다" | profile.py L157-158 | ✅ Match |
| Notion 권한 없음 (403) | 400 + "Integration을 연결하세요" | profile.py L159-160 | ✅ Match |
| Notion 타임아웃 (408) | 408 + "응답 시간 초과" | profile.py L155-156: `httpx.TimeoutException` -> 408 | ✅ Match |
| GPT 구조화 실패 | `raw_text` + `parse_error` | base.py L67-68 | ✅ Match |

**Score: 100%** (8/8 items) -- Previously 87.5%

---

## 5. Backend Settings Masking & Status

| Design Item (implicit from Section 5-6) | Implementation | Status |
|------------------------------------------|---------------|--------|
| Notion key masking in `_masked_settings` | settings.py | ✅ Match |
| Notion status in `/status` endpoint | settings.py | ✅ Match |
| `StatusResponse` includes `notion: dict` | settings.py | ✅ Match |
| Notion key preservation in PUT handler | settings.py | ✅ Match |

**Score: 100%** (4/4)

---

## 6. Differences Summary

### 6.1 Missing Features (Design O, Implementation X)

| # | Item | Design Location | Description | Impact |
|---|------|-----------------|-------------|--------|
| 1 | Notion import result preview | Section 7.2 | Import 완료 후 profile + career_entries 미리보기 UI 미구현 (toast/console.log만 존재) | Low |

### 6.2 Added Features (Design X, Implementation O)

| # | Item | Implementation Location | Description | Impact |
|---|------|------------------------|-------------|--------|
| 1 | `file.filename` null check | profile.py L86-87 | 방어적 코딩 (양호) | None |
| 2 | Extensions sorted in error msg | profile.py L95 | 정렬된 확장자 출력 | None |
| 3 | Notion 404 error handling | profile.py L161-162 | 페이지 못 찾을 때 404 반환 | None (good) |
| 4 | `NotionImportRequest` model | profile.py L126-127 | Pydantic body model (Design에 암시적) | None |
| 5 | Notion page external link | profile/page.tsx L235-244 | 페이지 목록에 Notion 외부 링크 아이콘 | None (good UX) |
| 6 | Enter key search trigger | profile/page.tsx L200 | 검색 Input에서 Enter 키 지원 | None (good UX) |

### 6.3 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | FileConnector `extract_text` type hint | `source: tuple[bytes, str]` | `source: Any` | None (cosmetic) |
| 2 | NotionConnector `extract_text` type hint | `source: str` | `source: Any` | None (cosmetic) |

---

## 7. Match Rate Calculation

| Section | Items | Matched | Rate | Delta |
|---------|:-----:|:-------:|:----:|:-----:|
| 1. Module Structure | 4 | 4 | 100% | -- |
| 2. DataConnector ABC | 8 | 8 | 100% | -- |
| 3. FileConnector | 7 | 6.75 | 96% | -- |
| 4. NotionConnector | 12 | 11.75 | 98% | -- |
| 5. Settings Model | 2 | 2 | 100% | -- |
| 6. API Endpoints | 9 | 8.5 | 92% | -- |
| 7. Frontend UI | 16 | 15.5 | 96.9% | +59.4% |
| 8. Error Handling | 8 | 8 | 100% | +12.5% |
| **Total** | **66** | **64.5** | **97%** | **+15%** |

```
Overall Match Rate: 97% (previously 82%)

Backend Match Rate: 99% (43/44 items) — previously 97%
Frontend Match Rate: 96.9% (15.5/16 items) — previously 37.5%
Error Handling Rate: 100% (8/8 items) — previously 87.5%

Status: PASS (target >= 90%)
```

---

## 8. Iteration Summary

| Gap Item | Previous Status | Current Status | Resolution |
|----------|:--------------:|:--------------:|------------|
| FileUpload accept `.txt,.md` | ❌ Missing | ✅ Fixed | `file-upload.tsx` L76 |
| FileUpload client validation | ❌ Missing | ✅ Fixed | `file-upload.tsx` L21 |
| FileUpload display text | ❌ Missing | ✅ Fixed | `file-upload.tsx` L67 |
| Notion import card | ❌ Missing | ✅ Fixed | `profile/page.tsx` L172-271 |
| Notion search input | ❌ Missing | ✅ Fixed | `profile/page.tsx` L194-210 |
| Notion page list | ❌ Missing | ✅ Fixed | `profile/page.tsx` L213-248 |
| Notion import button | ❌ Missing | ✅ Fixed | `profile/page.tsx` L251-259 |
| Notion fallback message | ❌ Missing | ✅ Fixed | `profile/page.tsx` L262-268 |
| Notion loading states | ❌ Missing | ✅ Fixed | `profile/page.tsx` L41-42 |
| Notion result preview | ❌ Missing | ⚠️ Partial | Toast only, no structured preview |
| Notion timeout -> 408 | ❌ Missing | ✅ Fixed | `profile.py` L155-156 |

**Resolved: 10/11 items (91%), 1 partial**

---

## 9. Recommended Actions

### 9.1 Optional Improvements (Match Rate already >= 90%)

| Priority | Item | File | Notes |
|----------|------|------|-------|
| Low | Notion import result preview UI | `frontend/app/profile/page.tsx` | 가져온 profile + career_entries를 카드 형태로 미리보기 후 "프로필에 반영" 버튼 추가 |
| Low | Type hint 정밀화 | `connectors/file.py`, `connectors/notion.py` | `Any` -> 구체적 타입 (cosmetic) |

### 9.2 Design Document Updates Recommended

| Item | Location | Notes |
|------|----------|-------|
| `NotionImportRequest` model | Section 6.3 | Body model을 design에 명시 |
| 404 error handling | Section 8 | Notion 페이지 not found 케이스 추가 |
| `file.filename` null check | Section 6.1 | 방어적 코딩 패턴 반영 |
| External link in page list | Section 7.2 | UI 와이어프레임에 외부 링크 아이콘 추가 |

---

## 10. Synchronization Recommendation

Match Rate가 97%이며 90% 이상이므로, 설계와 구현이 잘 일치합니다.

**잔여 gap (1건)**은 Notion import 결과 미리보기 UI로, 핵심 기능(검색 -> 선택 -> 가져오기 -> 파싱)은 완전히 동작합니다. 이 UI는 사용자 경험 개선 항목으로 분류하여 후속 이터레이션에서 처리할 수 있습니다.

**권장 조치:**
1. 현재 상태로 Check 통과 처리 (97% >= 90% threshold)
2. 추가된 구현 항목(6건)을 설계 문서에 반영하여 문서 동기화
3. 결과 미리보기 UI는 백로그에 추가

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial gap analysis (Match Rate: 82%) | gap-detector |
| 0.2 | 2026-03-16 | Re-analysis after iteration fixes (Match Rate: 82% -> 97%) | gap-detector |
