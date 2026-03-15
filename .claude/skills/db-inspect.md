---
description: CareerLab DB 데이터를 API를 통해 조회하고 진단합니다. 테이블별 조회, 임베딩 상태 확인, 시맨틱 검색 디버깅, 데이터 통계를 제공합니다. Use when user says "DB 확인", "db inspect", "데이터베이스 조회", "what's in the database", "임베딩 확인", "왜 매칭이 안 돼", or needs to debug data flow.
---

# /db-inspect

CareerLab의 Supabase 데이터를 API 엔드포인트를 통해 조회하고 진단한다.

## Prerequisites

- 백엔드 서버 실행 중 (`http://localhost:8000`)
- Supabase 연결 설정 완료

## Steps

### 1. 조회 범위 확인

```
무엇을 확인할까요?

1. 전체 요약 — 모든 테이블의 데이터 통계
2. 프로필 — 프로필 + 경력 항목 상세
3. 자소서 — 자소서 + 항목 상세
4. 기업 분석 — 분석 결과 키워드/요구사항
5. 면접 — 질문 + 모의면접 세션
6. 임베딩 진단 — 경력 항목의 벡터 임베딩 상태
```

### 2. 데이터 조회

API 엔드포인트로 데이터를 수집한다:

**전체 요약:**
```
GET /api/profile → profile count
GET /api/profile/entries/{profile_id} → career_entries count + embedding status
GET /api/resume → resume count
GET /api/resume/analyses → analyses count
GET /api/interview/questions/{resume_id} → questions count (per resume)
```

**프로필 상세:**
```
GET /api/profile → 프로필 기본 정보
GET /api/profile/entries/{profile_id} → 경력 항목 목록
```

**자소서 상세:**
```
GET /api/resume → 모든 자소서
GET /api/resume/{id} → 각 자소서의 항목
```

### 3. 결과 표시

#### 전체 요약
```
## Database Summary

| 테이블 | 건수 | 비고 |
|--------|------|------|
| profiles | 1 | |
| career_entries | 12 | 10 embedded, 2 pending |
| company_analyses | 5 | |
| resumes | 3 | 8 items total |
| interview_questions | 15 | 3 resumes × 5 questions |
| mock_sessions | 2 | 1 evaluated |
| feedback_reports | 4 | |
```

#### 경력 항목 상세
```
## Career Entries (profile: {name})

| # | 유형 | 제목 | 미리보기 | 임베딩 | STAR |
|---|------|------|---------|--------|------|
| 1 | career | 프로젝트 리드 | AWS 마이그레이션... | ✓ | S✓ T✓ A✓ R✓ |
| 2 | project | 데이터 분석 | 고객 이탈 예측... | ✓ | S✓ T✗ A✓ R✗ |
| 3 | skill | Python | 3년 경력... | ✗ | N/A |
```

### 4. 임베딩 진단 (옵션 6)

경력 항목의 임베딩 상태를 점검:
- embedding 컬럼이 null인 항목 탐지
- null인 경우: "OpenAI 설정을 확인하세요. 임베딩은 text-embedding-3-small 모델을 사용합니다."
- 전체 임베딩률 표시: "12개 중 10개 임베딩 완료 (83%)"

시맨틱 검색이 작동하지 않는 경우:
- 임베딩이 있는 항목이 0개인지 확인
- Supabase의 `match_career_entries` RPC 함수 존재 여부 확인은 직접 불가하므로, 마이그레이션 파일 확인 안내
- "시맨틱 검색 문제: `supabase/migrations/00001_initial_schema.sql`에서 `match_career_entries` 함수가 정의되어 있는지 확인하세요."

### 5. 후속 안내

```
관련 작업:
- 임베딩 누락 시: 프로필 페이지에서 경력 항목을 수정/저장하면 임베딩이 재생성됩니다
- 데이터 초기화: supabase db reset (주의: 모든 데이터 삭제)
- 백업: supabase db dump -f backup.sql
```

## API Endpoints Used

| Method | Endpoint | 용도 |
|--------|----------|------|
| GET | `/api/profile` | 프로필 목록 |
| GET | `/api/profile/entries/{profile_id}` | 경력 항목 |
| GET | `/api/resume` | 자소서 목록 |
| GET | `/api/resume/{id}` | 자소서 상세 |
| GET | `/api/resume/analyses` | 기업 분석 목록 |
| GET | `/api/interview/questions/{resume_id}` | 면접 질문 |

## Error Handling

- **Supabase 미연결**: "Supabase에 연결되지 않았습니다. /settings에서 설정하세요."
- **프로필 없음**: "프로필이 없습니다. http://localhost:3000/profile 에서 생성하세요."
- **빈 데이터**: 빈 테이블은 "0건 — 아직 데이터가 없습니다"로 표시
