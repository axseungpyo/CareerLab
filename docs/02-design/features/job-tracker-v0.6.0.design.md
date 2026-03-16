# Design: CareerLab v0.6.0 — 취업 관리 시스템

> Plan 참조: `docs/01-plan/features/job-tracker-v0.6.0.plan.md`

---

## 1. DB 스키마

**파일**: `supabase/migrations/00002_applications.sql`

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT,
  job_url TEXT,
  stage TEXT NOT NULL DEFAULT 'interested'
    CHECK (stage IN ('interested', 'applied', 'interview', 'result')),
  result TEXT CHECK (result IN ('pass', 'fail', 'pending')),
  deadline TIMESTAMPTZ,
  interview_date TIMESTAMPTZ,
  notes TEXT,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  company_analysis_id UUID REFERENCES company_analyses(id) ON DELETE SET NULL,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_applications_profile ON applications(profile_id);
CREATE INDEX idx_applications_stage ON applications(stage);
CREATE INDEX idx_applications_deadline ON applications(deadline);
```

**Stage 정의:**
| Stage | 한글 | 설명 |
|-------|------|------|
| `interested` | 관심 | 관심 기업으로 등록 (아직 미지원) |
| `applied` | 지원완료 | 서류 제출 완료 |
| `interview` | 면접 | 면접 일정 확정 또는 진행 중 |
| `result` | 결과 | 최종 결과 (pass/fail/pending) |

---

## 2. 백엔드 모듈

### 2.1 Pydantic 모델

**파일**: `backend/modules/application/models.py`

```python
from pydantic import BaseModel
from datetime import datetime

class ApplicationCreate(BaseModel):
    profile_id: str
    company_name: str
    job_title: str | None = None
    job_url: str | None = None
    stage: str = "interested"
    deadline: datetime | None = None
    interview_date: datetime | None = None
    notes: str | None = None
    resume_id: str | None = None
    company_analysis_id: str | None = None

class ApplicationUpdate(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    job_url: str | None = None
    deadline: datetime | None = None
    interview_date: datetime | None = None
    notes: str | None = None
    result: str | None = None
    resume_id: str | None = None

class StageUpdate(BaseModel):
    stage: str  # interested | applied | interview | result
    result: str | None = None  # pass | fail | pending (result stage only)

class ApplicationResponse(BaseModel):
    id: str
    profile_id: str
    company_name: str
    job_title: str | None
    job_url: str | None
    stage: str
    result: str | None
    deadline: datetime | None
    interview_date: datetime | None
    notes: str | None
    resume_id: str | None
    company_analysis_id: str | None
    parsed_data: dict | None
    created_at: datetime
    updated_at: datetime

class UrlParseRequest(BaseModel):
    url: str

class UrlParseResponse(BaseModel):
    company_name: str | None
    job_title: str | None
    deadline: str | None
    requirements: list[str]
    keywords: list[str]
    raw_text: str | None
```

### 2.2 Repository

**파일**: `backend/modules/application/repository.py`

```python
class ApplicationRepository:
    def __init__(self):
        # supabase client 초기화 (get_effective_supabase)

    def create(self, data: dict) -> dict
    def get(self, app_id: str) -> dict | None
    def get_all(self, profile_id: str) -> list[dict]
    def update(self, app_id: str, data: dict) -> dict
    def update_stage(self, app_id: str, stage: str, result: str | None) -> dict
    def delete(self, app_id: str) -> None
    def get_calendar_events(self, profile_id: str) -> list[dict]
        # deadline + interview_date가 있는 항목만 반환
```

### 2.3 URL Parser

**파일**: `backend/modules/application/url_parser.py`

```python
class JobUrlParser:
    """Parse job posting URL → structured data using Tavily + GPT."""

    async def parse(self, url: str) -> dict:
        # 1. Tavily Search로 URL 내용 검색
        #    query = url, search_depth = "advanced", include_raw_content = True
        #
        # 2. GPT-5 mini로 구조화:
        #    { company_name, job_title, deadline, requirements[], keywords[] }
        #
        # 3. 결과 반환

PARSE_URL_PROMPT = """다음 채용공고 내용에서 정보를 추출하세요.
반드시 JSON으로 응답:
{
  "company_name": "기업명",
  "job_title": "채용 직무/포지션",
  "deadline": "마감일 (YYYY-MM-DD, 없으면 null)",
  "requirements": ["자격요건1", "자격요건2"],
  "keywords": ["핵심키워드1", "핵심키워드2"]
}"""
```

**플로우:**
```
URL 입력
  ↓ Tavily API (search_depth=advanced, include_raw_content=True)
  ↓ 페이지 내용 추출
  ↓ GPT-5 mini (PARSE_URL_PROMPT + 내용)
  ↓ JSON 파싱
  ↓ { company_name, job_title, deadline, requirements, keywords }
```

### 2.4 API 라우트

**파일**: `backend/api/routes/application.py`

```
GET    /api/applications?profile_id=
  → 전체 목록 (stage 기준 정렬: interested → applied → interview → result)
  → 응답: list[ApplicationResponse]

GET    /api/applications/{id}
  → 상세 (resume, company_analysis join 포함)
  → 응답: ApplicationResponse

POST   /api/applications
  → 새 지원 등록
  → Body: ApplicationCreate
  → 응답: ApplicationResponse (201)

PUT    /api/applications/{id}
  → 수정
  → Body: ApplicationUpdate
  → 응답: ApplicationResponse

PATCH  /api/applications/{id}/stage
  → 단계 변경
  → Body: StageUpdate { stage, result? }
  → 응답: ApplicationResponse

DELETE /api/applications/{id}
  → 삭제 (204)

POST   /api/applications/parse-url
  → URL 파싱 → 자동 정보 추출
  → Body: UrlParseRequest { url }
  → 응답: UrlParseResponse

GET    /api/applications/calendar?profile_id=
  → 캘린더용 일정 데이터
  → 응답: [{ id, company_name, type: "deadline"|"interview", date, stage }]
```

---

## 3. 프론트엔드

### 3.1 타입 추가

**파일**: `frontend/lib/types.ts`

```typescript
export interface Application {
  id: string;
  profile_id: string;
  company_name: string;
  job_title: string | null;
  job_url: string | null;
  stage: "interested" | "applied" | "interview" | "result";
  result: "pass" | "fail" | "pending" | null;
  deadline: string | null;
  interview_date: string | null;
  notes: string | null;
  resume_id: string | null;
  company_analysis_id: string | null;
  parsed_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  company_name: string;
  type: "deadline" | "interview";
  date: string;
  stage: string;
}
```

### 3.2 칸반 보드 (`/applications`)

**파일**: `frontend/app/applications/page.tsx`

**레이아웃**: 4열 그리드 (mobile: 1열 스크롤)

```
┌─────────────────────────────────────────────────┐
│ 지원 관리          [+ 새 지원] [📅 캘린더]        │
├─────────┬─────────┬─────────┬───────────────────┤
│ 관심(3)  │지원(5)  │면접(2)  │결과(4)             │
│          │         │         │                   │
│ [카드]   │ [카드]  │ [카드]  │ [카드 ✅/❌]      │
│ [카드]   │ [카드]  │ [카드]  │ [카드]             │
│ [카드]   │ [카드]  │         │ [카드]             │
│          │ [카드]  │         │ [카드]             │
└─────────┴─────────┴─────────┴───────────────────┘
```

**카드 컴포넌트:**
```
┌─────────────────────┐
│ 삼성전자              │ ← company_name (굵게)
│ SW 개발              │ ← job_title
│ 🔴 D-3              │ ← deadline D-day (빨강: 3일 이내)
│ [자소서] [→ 다음단계] │ ← resume 링크 + stage 변경 버튼
└─────────────────────┘
```

**Stage 변경**: 카드의 "→ 다음단계" 버튼 클릭 → `PATCH /api/applications/{id}/stage`
- interested → applied
- applied → interview
- interview → result (result 선택 다이얼로그: pass/fail/pending)

**D-day 색상:**
- D-3 이내: 빨간색
- D-7 이내: 주황색
- D-7+: 기본색
- 지나감: 회색 + 취소선

### 3.3 새 지원 등록 (`/applications/new`)

**파일**: `frontend/app/applications/new/page.tsx`

```
┌─────────────────────────────────────┐
│ 새 지원 등록                         │
│                                      │
│ URL 붙여넣기 (선택):                  │
│ [________________] [자동 파싱]        │
│                                      │
│ ── 기본 정보 ──                      │
│ 기업명*    [_______________]          │
│ 직무       [_______________]          │
│ 공고 URL   [_______________]          │
│ 마감일     [📅 날짜 선택]             │
│ 면접일     [📅 날짜 선택]             │
│ 메모       [_______________]          │
│                                      │
│ ── 연결 ──                           │
│ 자소서     [드롭다운: 기존 자소서]     │
│                                      │
│              [등록하기]               │
└─────────────────────────────────────┘
```

**URL 파싱 플로우:**
1. URL 입력 → "자동 파싱" 클릭
2. `POST /api/applications/parse-url` 호출
3. 응답으로 기업명/직무/마감일 자동 채우기
4. 사용자가 확인/수정 후 "등록하기"

### 3.4 캘린더 뷰 (`/applications/calendar`)

**파일**: `frontend/app/applications/calendar/page.tsx`

- 월간 캘린더 그리드 (7열 × 5~6행)
- 각 날짜 셀에 이벤트 표시:
  - 📅 마감: 빨간 도트 + 기업명
  - 🎤 면접: 파란 도트 + 기업명
- 이전/다음 월 이동 버튼
- 이벤트 클릭 → `/applications/[id]`로 이동
- 자체 CSS 그리드로 구현 (외부 캘린더 라이브러리 불필요)

### 3.5 지원 상세 (`/applications/[id]`)

**파일**: `frontend/app/applications/[id]/page.tsx`

- 기업 정보 (기업명, 직무, URL 외부 링크)
- 현재 단계 표시 + 단계 변경 드롭다운
- 마감일/면접일 + D-day 표시
- 메모 편집
- 연결된 자소서 바로가기
- parsed_data 표시 (자격요건, 키워드)
- 삭제 버튼

### 3.6 네비게이션 수정

**파일**: `frontend/components/navigation.tsx`

NAV_ITEMS에 추가:
```typescript
{ href: "/applications", label: "지원관리", icon: Briefcase },
```
- `Briefcase` 아이콘 (lucide-react)
- 위치: "첨삭" 뒤, "설정" 앞

---

## 4. 에러 처리

| 상황 | 처리 |
|------|------|
| URL 파싱 실패 (Tavily 타임아웃) | "공고 정보를 가져올 수 없습니다. 수동으로 입력하세요." |
| URL 파싱 GPT 실패 | raw_text 반환 + "자동 파싱에 실패했습니다." |
| 잘못된 stage 값 | 400 + "유효하지 않은 단계입니다." |
| application 미존재 | 404 + "지원 정보를 찾을 수 없습니다." |
| Tavily 키 없음 | URL 파싱 비활성화, 수동 입력만 가능 안내 |

---

## 5. 구현 순서

```
Step 1: DB + 백엔드 코어 (1일)
  ├─ supabase/migrations/00002_applications.sql
  ├─ modules/application/models.py
  ├─ modules/application/repository.py
  ├─ modules/application/service.py (thin wrapper)
  ├─ api/routes/application.py (CRUD + stage)
  └─ main.py (라우터 등록)

Step 2: URL 파싱 (0.5일)
  ├─ modules/application/url_parser.py
  └─ POST /api/applications/parse-url
  └─ GET /api/applications/calendar

Step 3: 프론트엔드 — 칸반 보드 (1.5일)
  ├─ lib/types.ts (Application, CalendarEvent 추가)
  ├─ app/applications/page.tsx (4열 칸반)
  ├─ app/applications/new/page.tsx (등록 폼 + URL 파싱)
  └─ app/applications/[id]/page.tsx (상세)

Step 4: 캘린더 + 네비게이션 (1일)
  ├─ app/applications/calendar/page.tsx
  ├─ components/navigation.tsx (메뉴 추가)
  └─ 홈 대시보드 연결

Step 5: 검증 (0.5일)
  ├─ tsc --noEmit
  ├─ pytest tests/
  └─ 수동 테스트 (칸반/캘린더/URL파싱)
```
