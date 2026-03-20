# Plan: 기업분석 고도화 v0.9

> Feature: `company-analysis-v2`
> Created: 2026-03-20
> Status: Plan
> Method: Plan Plus (Brainstorming-Enhanced PDCA)

---

## 1. User Intent Discovery

### Core Problem
기업분석 기능의 결과 활용도가 낮고, UX가 텍스트 나열 수준. 웹 검색 비용이 상용화 시 비효율적 (Tavily Advanced $0.016/검색).

### Target Users
취업 준비생 — 채용공고를 분석하고 자소서/면접에 활용하는 사용자

### Success Criteria
- 분석 결과를 사용자가 편집하여 자소서 생성에 직접 반영 가능
- 웹 검색 비용 98% 절감 (Tavily → Serper)
- URL 입력만으로 채용공고 자동 추출
- 여러 기업 분석을 비교하여 지원 전략 수립 가능

---

## 2. Alternatives Explored

### 웹 검색 프로바이더
| 옵션 | 가격/1K | 결정 |
|------|--------|------|
| Tavily (현재) | $8~16 | 유지 (기존 호환) |
| **Serper (추가)** | **$0.30** | ✅ 기본 프로바이더로 추가 |
| Perplexity (현재) | ~$5 | 유지 (장기 제거 검토) |

### 상세 페이지 구조
- **선택: 탭 기반** — 요약/요구사항/전략/웹리서치 탭으로 분리
- 대안: 아코디언 — 섹션별 접힘/펼침 (모바일 유리하나 전체 파악 어려움)

---

## 3. YAGNI Review

### In Scope (v0.9)
1. Serper 프로바이더 추가 + 웹 검색 ON/OFF 토글
2. 상세 페이지 UX 개편 (탭 구조)
3. 키워드/요구사항 편집 (추가/삭제/수정)
4. 채용공고 URL 자동 파싱
5. 재분석/업데이트
6. 단계별 로딩 피드백 (프로그레스)
7. 기업 비교 기능

### Out of Scope
- 지원자 경쟁 분석 (외부 데이터 필요)
- 합격자소서 DB 연동
- 실시간 채팅/커뮤니티

---

## 4. Feature Specifications

### 4.1 Serper 프로바이더 추가

**백엔드** (`backend/core/research.py`):
- `_search_serper(query, max_results)` 메서드 추가
- Serper API: `POST https://google.serper.dev/search`
- 헤더: `X-API-KEY`, Body: `{ q, gl: "kr", hl: "ko", num }`
- 응답 매핑: `organic[]` → `{ title, snippet→description, link→url }`

**설정** (`/settings` UI):
- 프로바이더 선택: Tavily | **Serper** | Perplexity
- Serper API Key 입력 필드
- 웹 검색 ON/OFF 토글 (기본: OFF → 채용공고만 분석)

**환경변수**:
- `SERPER_API_KEY` (.env)
- `app.llm.search.provider`: "serper" 옵션 추가
- `app.llm.search.enabled`: true/false (새 필드)

### 4.2 상세 페이지 UX 개편

**현재**: 긴 스크롤, 텍스트 나열
**목표**: 4-탭 구조

```
[요약] [요구사항] [전략] [리서치]

요약 탭:
  ┌─────────────────────────────────┐
  │ 기업명 / 분석일 / URL 링크      │
  │ ───────────────────────         │
  │ 기업 개요 (산업/문화/단계/동향)  │
  │ 인재상 (핵심가치 Badge + 설명)   │
  │ 키워드 (편집 가능 Badge)         │
  │ ───────────────────────         │
  │ [자소서 생성] [재분석] [지원등록] │
  └─────────────────────────────────┘

요구사항 탭:
  ┌─────────────────────────────────┐
  │ 카테고리별 필터 (필수/우대/기술)  │
  │ 각 항목: 텍스트 + [수정] [삭제]  │
  │ [+ 요구사항 추가] 버튼           │
  └─────────────────────────────────┘

전략 탭:
  ┌─────────────────────────────────┐
  │ 자소서 전략 (어필 포인트, 톤앤매너)│
  │ 면접 준비 (예상 주제, 기업 특징)  │
  │ [면접 준비 시작 →] 연동 버튼     │
  └─────────────────────────────────┘

리서치 탭:
  ┌─────────────────────────────────┐
  │ 웹 검색 결과 (카테고리별)        │
  │ 검색 미사용 시: "웹 검색이 비활성" │
  │ [웹 리서치 실행] 버튼            │
  └─────────────────────────────────┘
```

### 4.3 키워드/요구사항 편집

**키워드**:
- Badge 클릭 → 인라인 수정
- Badge 옆 X 버튼 → 삭제
- [+ 키워드 추가] 버튼
- 변경 시 `PUT /api/company/{id}` (keywords 필드 업데이트)

**요구사항**:
- 각 항목 우측에 [수정] [삭제] 아이콘
- [+ 요구사항 추가] 폼 (태그 선택 + 텍스트 입력)
- 변경 시 `PUT /api/company/{id}` (requirements 필드 업데이트)

**백엔드 추가**:
- `PUT /api/company/{analysis_id}` — 부분 업데이트 엔드포인트 (keywords, requirements, talent_profile, research_notes)

### 4.4 채용공고 URL 자동 파싱

**프론트엔드** (`/company/new`):
- URL 입력 후 [자동 추출] 버튼
- 로딩 중 표시 → 추출된 텍스트를 채용공고 Textarea에 자동 채움

**백엔드**:
- `POST /api/company/parse-url` — URL을 받아 텍스트 추출
- 구현: `httpx`로 HTML 가져오기 → BeautifulSoup/selectolax로 텍스트 추출
- 또는 Firecrawl/Serper의 scrape 기능 활용
- 에러 처리: 접근 불가 URL, 로그인 필요 사이트 → 사용자에게 수동 입력 안내

### 4.5 재분석/업데이트

**프론트엔드**:
- 상세 페이지 헤더에 [재분석] 버튼
- 클릭 시: 기존 분석 ID 유지, 새 분석 실행 후 덮어쓰기
- 확인 다이얼로그: "기존 분석 결과가 업데이트됩니다. 계속하시겠습니까?"

**백엔드**:
- `PUT /api/company/{analysis_id}/reanalyze`
- 기존 company_name + job_posting_text 재사용 → 새로 분석 실행 → 같은 row 업데이트

### 4.6 단계별 로딩 피드백

**프론트엔드** (`/company/new`):
- 분석 시작 → SSE 스트리밍으로 단계 수신
- 프로그레스 UI:
  ```
  ✅ 채용공고 입력 확인
  ⏳ 웹 리서치 진행 중... (3/3 카테고리)
  ○ AI 분석 대기
  ○ 결과 저장
  ```

**백엔드**:
- `POST /api/company/analyze` → SSE StreamingResponse로 변경
- 각 단계 완료 시 이벤트 전송: `{ step: "web_search", status: "done" }`

### 4.7 기업 비교 기능

**프론트엔드** (`/company/compare`):
- 2~3개 기업 선택 (체크박스 또는 드롭다운)
- 비교 항목:
  - 요구사항 수 / 키워드 수
  - 인재상 핵심가치 비교
  - 기업 개요 (산업/문화/단계) 나란히
  - 자소서 전략 차이점

**백엔드**:
- 추가 API 불필요 (기존 `GET /api/company` + 프론트엔드 조합)

---

## 5. Technical Design

### 5.1 백엔드 변경

| 파일 | 변경 |
|------|------|
| `core/research.py` | `_search_serper()` 추가 + provider 분기 |
| `core/app_settings.py` | `search.enabled`, `search.serper_api_key` 필드 |
| `api/routes/company.py` | `PUT /{id}`, `PUT /{id}/reanalyze`, `POST /parse-url` 추가 |
| `modules/resume/analyzer.py` | `search_enabled` 분기 + SSE 스트리밍 |

### 5.2 프론트엔드 변경

| 파일 | 변경 |
|------|------|
| `app/company/[id]/page.tsx` | 4-탭 구조 + 키워드/요구사항 편집 |
| `app/company/new/page.tsx` | URL 자동 파싱 + 단계별 로딩 + 웹검색 토글 |
| `app/company/compare/page.tsx` | **신규** — 기업 비교 페이지 |
| `app/settings/page.tsx` | Serper 프로바이더 + 웹 검색 ON/OFF |

### 5.3 DB 변경
- `company_analyses` 테이블: 변경 없음 (기존 스키마로 충분)

---

## 6. Implementation Priority

### Sprint 1 (P0 — 핵심)
1. Serper 프로바이더 + 웹 검색 ON/OFF
2. 상세 페이지 4-탭 UX 개편

### Sprint 2 (P1 — 활용도)
3. 키워드/요구사항 편집 + `PUT` API
4. 채용공고 URL 자동 파싱
5. 재분석/업데이트

### Sprint 3 (P2 — 부가)
6. 단계별 로딩 피드백 (SSE)
7. 기업 비교 기능

---

## 7. Risks & Mitigations

| 리스크 | 대응 |
|--------|------|
| Serper API 변경/중단 | Tavily fallback 유지, 프로바이더 추상화 |
| URL 파싱 실패 (로그인 필요 사이트) | 실패 시 수동 입력 안내 메시지 |
| 재분석 시 기존 자소서 연동 데이터 불일치 | 재분석 확인 다이얼로그 + FK 관계 유지 |
| SSE 스트리밍 복잡도 | 기존 자소서 생성 SSE 패턴 재사용 |

---

## 8. Next Steps

```
/pdca design company-analysis-v2   ← 상세 설계
/pdca do company-analysis-v2       ← 구현
/pdca analyze company-analysis-v2  ← Gap 분석
```
