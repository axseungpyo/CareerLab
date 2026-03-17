# Plan Plus: 기업분석 + 자소서 UX 고도화 v0.8

> Feature: `ux-resume-company-v0.8`
> Date: 2026-03-18
> Method: Plan Plus (Brainstorming-Enhanced)

---

## User Intent Discovery

### 핵심 문제
1. 기업분석 `/company` — "새 분석"/"첫 분석 시작" 중복 버튼, UX 미흡
2. 자소서 생성 `/resume/new` — 기출문항 없이 자유입력만, 1문항씩만 생성

### 핵심 목표
- **범용 자소서 UX 고도화** (삼성뿐 아니라 모든 기업 대응)
- **기업별 기출문항 자동 로드** → 문항 설정 → 멀티 문항 순차 생성

### 성공 기준
- 기업분석 중복 버튼 0개
- 자소서 생성 3스텝 위저드 (기업선택→문항설정→생성)
- 기출문항 DB에서 기업 선택 시 자동 세팅
- 멀티 문항 순차 AI 생성 + 진행률 표시

---

## Alternatives Explored

| 접근법 | 설명 | 결정 |
|--------|------|------|
| 통합 스텝 위저드 | /resume/new 한 페이지에서 3스텝 진행 | **채택** |
| 기업분석 페이지에서 바로 자소서 | /company/[id]에서 인라인 생성 | 기각 |
| 멀티 페이지 위저드 | /resume/new/step-1~3 별도 URL | 기각 (과도) |

기출문항 DB:
| 접근법 | 설명 | 결정 |
|--------|------|------|
| essay_questions 테이블 | 기업별/기간별 기출문항 DB | **채택** |
| JSON 파일 | 정적 파일 관리 | 기각 (확장성) |
| company_analyses에 포함 | JSONB 컬럼 | 기각 (관심사 혼합) |

---

## YAGNI Review

### v1 포함 (필수)
- [x] 기업분석 중복 버튼 제거 + 빈 상태 통합
- [x] 분석 카드에 자소서 바로가기 아이콘
- [x] 기업분석 상세 페이지 UX 개선
- [x] 3스텝 위저드 + 기출문항 자동 로드
- [x] 멀티 문항 순차 생성 + 진행률
- [x] 문항 수정/삭제/추가 UI
- [x] essay_questions 테이블 + CRUD API

### Out of Scope (v2+)
- 기출문항 크롤링 자동 수집
- 기업별 합격 자소서 예시 표시
- AI 기반 문항 자동 생성 (기업분석 결과로)

---

## 구현 계획

### 1. DB: essay_questions 테이블

```sql
CREATE TABLE essay_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  period TEXT,
  question_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  char_limit INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_essay_questions_company ON essay_questions(company_name);
```

초기 시드 데이터 — 삼성화재 2026 상반기:
```sql
INSERT INTO essay_questions (company_name, period, question_number, question, char_limit, category)
VALUES
  ('삼성화재', '2026 상반기', 1, '삼성화재에 지원한 이유와 입사 후 회사에서 이루고 싶은 꿈을 기술하십시오.', 700, '지원동기'),
  ('삼성화재', '2026 상반기', 2, '본인의 성장과정에서 가장 큰 영향을 끼친 사건, 인물 등을 포함하여 기술하십시오.', 1500, '성장과정'),
  ('삼성화재', '2026 상반기', 3, '최근 사회이슈 중 하나를 선택하고, 이에 관한 자신의 견해를 기술하십시오.', 1000, '사회이슈'),
  ('삼성화재', '2026 상반기', 4, '직무와 관련하여 특정 분야의 전문성을 키우기 위해 꾸준히 노력한 경험에 대해 서술하고, 이를 바탕으로 본인이 지원 직무에 적합한 이유를 설명하십시오.', 1000, '직무역량');
```

### 2. 백엔드: essay_questions API

**파일:** `backend/api/routes/essay_questions.py` (신규)

```
GET  /api/essay-questions?company={name}     # 기업명으로 기출문항 조회
GET  /api/essay-questions/companies           # 기출문항이 있는 기업 목록
POST /api/essay-questions                     # 기출문항 추가
DELETE /api/essay-questions/{id}              # 삭제
```

**모델:** `backend/modules/resume/models.py`에 추가
```python
class EssayQuestion(BaseModel):
    id: str
    company_name: str
    period: str | None = None
    question_number: int
    question: str
    char_limit: int | None = None
    category: str | None = None
```

### 3. 프론트엔드: /company 페이지 UX 개선

**파일:** `frontend/app/company/page.tsx`

변경사항:
- "첫 분석 시작" 버튼 제거 → 빈 상태 카드에 "새 분석 시작" 하나로 통합
- 분석 카드에 자소서 바로가기 아이콘 `[📝]` 추가 → `/resume/new?analysisId={id}` 링크
- 빈 상태 안내 문구 개선: "채용공고를 분석하고 맞춤 자소서를 생성해 보세요"

### 4. 프론트엔드: /company/[id] 상세 UX 개선

**파일:** `frontend/app/company/[id]/page.tsx`

변경사항:
- 액션 버튼 정리 (자소서 생성 버튼 시각적 강조)
- 레이아웃 카드 순서 조정 (요구사항 → 기업개요 → 키워드 → 인재상 → 리서치)

### 5. 프론트엔드: /resume/new 3스텝 위저드 리라이트

**파일:** `frontend/app/resume/new/page.tsx` (전면 리라이트)

**타입:** `frontend/lib/types.ts`에 EssayQuestion 추가

#### Step 1: 기업 선택
```
┌─ 기업 선택 ─────────────────────────┐
│ [기존 기업분석 선택]                  │
│ ┌ 삼성화재       3/17 ──────┐      │
│ │ #인재상 #금융 #디지털      │      │
│ └────────────────────────┘      │
│ ┌ LG전자          3/15 ──────┐      │
│ │ #혁신 #기술 #글로벌        │      │
│ └────────────────────────┘      │
│                                      │
│ ─── 또는 ───                         │
│ [새 기업분석 시작] → 인라인 폼 펼침    │
│   회사명* [          ]               │
│   채용공고* [          ]             │
│   [분석 시작]                        │
└──────────────────────────────────────┘
```

- 기존 분석이 있으면 카드로 선택 (라디오)
- analysisId URL 파라미터로 진입 시 자동 선택 + Step 2로 이동
- "새 기업분석 시작" 클릭 시 인라인 폼 펼침

#### Step 2: 문항 설정
```
┌─ 문항 설정 ─────────────────────────┐
│ 삼성화재 2026 상반기 (자동 로드)      │
│                                      │
│ Q1. 지원 이유와 입사 후 꿈 [700자]    │
│     [수정] [삭제]                    │
│ Q2. 성장과정과 영향       [1500자]   │
│     [수정] [삭제]                    │
│ Q3. 사회이슈 견해         [1000자]   │
│     [수정] [삭제]                    │
│ Q4. 직무 경험과 강점      [1000자]   │
│     [수정] [삭제]                    │
│                                      │
│ [+ 문항 추가]                        │
│                                      │
│ 톤: [전문적 ▾]                       │
│                                      │
│ [전체 생성 시작]                      │
└──────────────────────────────────────┘
```

- 기업분석 결과에서 company_name으로 essay_questions 조회
- 기출이 있으면 자동 세팅, 없으면 빈 상태 + "직접 문항 추가"
- 각 문항: 질문 텍스트 수정, 글자수 제한 변경, 삭제 가능
- [+ 문항 추가]: 질문 텍스트 + 글자수 입력
- 톤 Select (전문적/진솔한/열정적/차분한)

#### Step 3: 멀티 문항 순차 생성
```
┌─ 자소서 생성 ───────────────────────┐
│ 삼성화재 — 4문항 생성 중              │
│                                      │
│ Q1. 지원 이유 (700자)     ✅ 완료    │
│ ┌──────────────────────────────┐   │
│ │ 저는 삼성화재의 디지털 혁신 ... │   │
│ │ ... (접기/펼치기)             │   │
│ └──────────────────────────────┘   │
│                                      │
│ Q2. 성장과정 (1500자)     🔄 생성중  │
│ ┌──────────────────────────────┐   │
│ │ ▋ 스트리밍 중...              │   │
│ └──────────────────────────────┘   │
│                                      │
│ Q3. 사회이슈 (1000자)     ⏳ 대기    │
│ Q4. 직무역량 (1000자)     ⏳ 대기    │
│                                      │
│ [전체 저장] [다시 생성]               │
└──────────────────────────────────────┘
```

- 문항별 상태: 대기(⏳) → 생성중(🔄 스트리밍) → 완료(✅)
- 완료된 문항은 접기/펼치기 토글
- 글자수 카운터 실시간 표시
- "전체 저장": Resume 1개 + ResumeItem N개 일괄 생성
- "다시 생성": 특정 문항만 재생성 가능

---

## 파일 목록

| 구분 | 파일 | 변경 |
|------|------|------|
| DB | Supabase migration | essay_questions 테이블 + 시드 데이터 |
| BE 신규 | `api/routes/essay_questions.py` | CRUD API 4개 엔드포인트 |
| BE 수정 | `modules/resume/models.py` | EssayQuestion 모델 |
| BE 수정 | `main.py` | essay_questions 라우터 등록 |
| FE 수정 | `lib/types.ts` | EssayQuestion 타입 |
| FE 수정 | `app/company/page.tsx` | 중복 제거 + 바로가기 아이콘 |
| FE 수정 | `app/company/[id]/page.tsx` | 액션 버튼/레이아웃 개선 |
| FE 리라이트 | `app/resume/new/page.tsx` | 3스텝 위저드 전면 리라이트 |

---

## 구현 순서

```
Step 1: DB — essay_questions 테이블 + 삼성화재 시드
Step 2: BE — EssayQuestion 모델 + API 라우트
Step 3: FE — types.ts에 EssayQuestion 추가
Step 4: FE — /company 중복 제거 + 바로가기 아이콘
Step 5: FE — /company/[id] UX 개선
Step 6: FE — /resume/new 3스텝 위저드 리라이트
Step 7: 검증 — tsc + E2E 테스트
```

---

## 검증

```bash
# 타입체크
cd frontend && npx tsc --noEmit

# API 확인
curl localhost:8000/api/essay-questions?company=삼성화재
curl localhost:8000/api/essay-questions/companies

# E2E
# /company → 중복 버튼 없음, 바로가기 아이콘 동작
# /resume/new → Step 1 기업 선택 → Step 2 문항 자동 로드 → Step 3 멀티 생성
# /resume/new?analysisId={id} → Step 2로 자동 이동
```

---

## Brainstorming Log

| Phase | 결정 | 근거 |
|-------|------|------|
| 목표 | 범용 자소서 UX 고도화 | 삼성 외 모든 기업 대응 |
| UX 흐름 | 통합 스텝 위저드 | 한 페이지에서 완료, URL 분리 불필요 |
| 기출 DB | essay_questions 테이블 | 확장성, CRUD 지원 |
| 데이터 구조 | 현행 유지 (Resume+ResumeItem) | DB 변경 최소화 |
| 기업분석 | 중복 제거 + 바로가기 | 최소 변경으로 최대 효과 |
