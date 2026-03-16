# Plan: CareerLab v0.6.0 — 취업 관리 시스템 (칸반 + 캘린더 + URL 파싱)

> 지원 현황을 칸반 보드로 관리하고, 캘린더로 일정을 시각화하며, 공고 URL을 자동 파싱하는 취업 관리 코어.

---

## User Intent Discovery

### 핵심 문제
여러 기업에 동시 지원할 때 마감일/면접일/진행 상태를 한눈에 파악하기 어려움.
채용공고 URL만 붙여넣으면 자동으로 정보를 추출하고 일정을 관리할 수 있는 시스템 필요.

### 대상 사용자
본인 전용. 추후 서비스화 시 다중 사용자 확장 가능한 구조.

### 대상 사이트 (v0.7.0+ 연동 예정)
사람인, 잡코리아, 링크드인, 자소설닷컴(https://jasoseol.com/)

### 성공 기준
1. 칸반 보드에서 지원 현황을 4단계(관심/지원완료/면접/결과)로 한눈에 파악
2. 캘린더에서 마감일/면접일을 시각화하고 놓치지 않음
3. 채용공고 URL 붙여넣기만으로 기업명/직무/마감일 자동 추출
4. 기존 자소서/면접 데이터와 연결

---

## Alternatives Explored

| 접근법 | 설명 | 채택 |
|--------|------|------|
| **단계적 확장** | v0.6.0 코어(칸반+캘린더+수동입력) → v0.7.0 크롤링 → v0.8.0 AI 추천 | **채택** |
| 외부 연동 우선 | 크롤링 먼저, UI 나중 | 보류 (크롤링 불안정성 리스크) |
| 한 번에 전부 | 칸반+크롤링+AI 한 번에 | 보류 (범위 과대) |

**채택 이유**: 수동 입력으로 코어 UX를 먼저 검증하고, 외부 연동은 안정적인 코어 위에 추가.

---

## YAGNI Review

### In Scope (v0.6.0)
- [x] `applications` DB 테이블 + Supabase 마이그레이션
- [x] 칸반 보드 (4단계: 관심 → 지원완료 → 면접 → 결과)
- [x] 캘린더 뷰 (마감일/면접일 시각화)
- [x] 공고 URL 자동 파싱 (Tavily + GPT → 기업명/직무/마감일 추출)
- [x] 수동 지원 등록 (기업명, 직무, 마감일, 면접일, 메모)
- [x] 기존 자소서 연결 (resume_id FK)
- [x] 네비게이션에 "지원 관리" 메뉴 추가

### Out of Scope (v0.7.0+)
- [ ] 사람인/잡코리아/자소설닷컴 크롤링 연동
- [ ] 링크드인 API 연동
- [ ] AI 채용공고 추천 (프로필 임베딩 매칭)
- [ ] 브라우저 알림/이메일 알림
- [ ] 드래그 앤 드롭 (v0.6.0에서는 클릭 기반 단계 변경)
- [ ] 통계 (지원 수/합격률) — 이미 대시보드에 기본 통계 있음

---

## 아키텍처

### DB 스키마

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT,
  job_url TEXT,
  stage TEXT NOT NULL DEFAULT 'interested'
    CHECK (stage IN ('interested', 'applied', 'interview', 'result')),
  result TEXT CHECK (result IN ('pass', 'fail', 'pending', NULL)),
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

### 백엔드

```
backend/modules/application/
  models.py       ← Pydantic 모델 (Create, Update, Response, StageUpdate)
  service.py      ← ApplicationService (CRUD + stage 변경)
  repository.py   ← Supabase CRUD
  url_parser.py   ← URL → Tavily 검색 + GPT 구조화 → 기업명/직무/마감일

backend/api/routes/application.py
  GET    /api/applications              ← 전체 목록 (stage별 그룹)
  GET    /api/applications/{id}         ← 상세
  POST   /api/applications              ← 새 지원 등록
  PUT    /api/applications/{id}         ← 수정
  PATCH  /api/applications/{id}/stage   ← 단계 변경
  DELETE /api/applications/{id}         ← 삭제
  POST   /api/applications/parse-url    ← URL 파싱 → 자동 정보 추출
  GET    /api/applications/calendar     ← 캘린더용 일정 데이터
```

### 프론트엔드

```
frontend/app/
  applications/
    page.tsx              ← 칸반 보드 (4열 레이아웃)
    calendar/page.tsx     ← 캘린더 뷰
    new/page.tsx          ← 새 지원 등록 폼 (URL 파싱 포함)
    [id]/page.tsx         ← 지원 상세 (메모, 자소서 링크, 면접 링크)
```

### 칸반 보드 UI

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   관심 (3)   │  지원완료 (5) │   면접 (2)   │   결과 (4)   │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │삼성전자  │ │ │카카오    │ │ │네이버   │ │ │LG전자 ✅│ │
│ │SW개발   │ │ │백엔드   │ │ │프론트   │ │ │합격     │ │
│ │D-3      │ │ │3/20 제출│ │ │면접3/25│ │ │         │ │
│ │[자소서] │ │ │[자소서] │ │ │[면접] │ │ │         │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘ │
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │현대자동차│ │ │쿠팡     │ │ │토스    │ │ │SK 하이닉│ │
│ │...      │ │ │...      │ │ │...     │ │ │불합격 ❌│ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘ │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### URL 파싱 플로우

```
사용자: URL 입력 (예: saramin.co.kr/recruit/xxx)
  ↓
POST /api/applications/parse-url { url: "..." }
  ↓
Tavily Search API로 URL 내용 검색
  ↓
GPT-5 mini로 구조화:
  { company_name, job_title, deadline, requirements[], keywords[] }
  ↓
프론트엔드 폼에 자동 채우기
  ↓
사용자 확인 후 저장
```

---

## 수정 대상 파일

### 신규 생성
| 파일 | 용도 |
|------|------|
| `supabase/migrations/00002_applications.sql` | applications 테이블 |
| `backend/modules/application/models.py` | Pydantic 모델 |
| `backend/modules/application/service.py` | 비즈니스 로직 |
| `backend/modules/application/repository.py` | Supabase CRUD |
| `backend/modules/application/url_parser.py` | URL 자동 파싱 |
| `backend/api/routes/application.py` | API 라우트 |
| `frontend/app/applications/page.tsx` | 칸반 보드 |
| `frontend/app/applications/calendar/page.tsx` | 캘린더 뷰 |
| `frontend/app/applications/new/page.tsx` | 새 지원 등록 |
| `frontend/app/applications/[id]/page.tsx` | 지원 상세 |

### 수정
| 파일 | 변경 |
|------|------|
| `backend/main.py` | application 라우터 등록 |
| `frontend/components/navigation.tsx` | "지원 관리" 메뉴 추가 |
| `frontend/lib/types.ts` | Application 타입 추가 |

---

## 구현 순서

```
Step 1: DB + 백엔드 코어 (1일)
  ├─ applications 테이블 마이그레이션
  ├─ models.py + repository.py + service.py
  └─ api/routes/application.py (CRUD + stage 변경)

Step 2: URL 파싱 (0.5일)
  ├─ url_parser.py (Tavily + GPT 구조화)
  └─ POST /api/applications/parse-url

Step 3: 칸반 보드 UI (1.5일)
  ├─ /applications 칸반 (4열 레이아웃)
  ├─ 카드 컴포넌트 (기업명, 직무, D-day, 자소서 링크)
  └─ 클릭 기반 단계 변경

Step 4: 캘린더 + 등록 (1일)
  ├─ /applications/calendar (월간 캘린더)
  ├─ /applications/new (URL 파싱 + 수동 입력)
  └─ /applications/[id] (상세 + 메모)

Step 5: 네비게이션 + 연결 (0.5일)
  ├─ 네비게이션 "지원 관리" 추가
  ├─ 홈 대시보드에 지원 현황 연결
  └─ 자소서 상세 → 지원 연결
```

**합계: 4.5일**

---

## Brainstorming Log

| Phase | 질문 | 결정 |
|-------|------|------|
| Intent | 핵심 문제 | 전체 통합 (칸반+캘린더+크롤링+AI추천) |
| Intent | 대상 사이트 | 사람인, 잡코리아, 링크드인, 자소설닷컴 |
| Intent | 성공 기준 | 칸반 보드 + 마감일 알림 + 채용공고 자동 추천 |
| Alternatives | 접근법 | 단계적 확장 (v0.6.0 코어 → v0.7.0 크롤링 → v0.8.0 AI) |
| YAGNI | v0.6.0 스코프 | 칸반+캘린더+URL파싱+DB (크롤링/알림/DnD 보류) |
| Validation | 아키텍처 | applications 테이블 + 4단계 칸반 + URL 파싱 승인 |

---

## 검증

```bash
# DB 마이그레이션
supabase db push

# 백엔드 테스트
curl http://localhost:8000/api/applications
curl -X POST http://localhost:8000/api/applications/parse-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=xxx"}'

# 프론트 타입체크
cd frontend && npx tsc --noEmit

# 전체 테스트
cd backend && python -m pytest tests/ -v
```
