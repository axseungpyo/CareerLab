---
description: CareerLab API 전체 엔드포인트 연기 테스트를 수행합니다. 서버 기동, 서비스 연결, 각 라우트 GET 엔드포인트, SSE 스트리밍, 에러 핸들링을 점검합니다. Use when user says "API 헬스체크", "api health", "test endpoints", "서버 상태", "is everything working", or after code changes.
---

# /api-healthcheck

CareerLab 백엔드의 모든 API 엔드포인트를 체계적으로 테스트한다.

## Prerequisites

- 백엔드 서버 실행 중이어야 함 (`http://localhost:8000`)

## Steps

### 1. 서버 기동 확인

`curl -s http://localhost:8000/docs` 또는 `GET http://localhost:8000/api/settings/status` 호출.
실패 시: "백엔드를 시작하세요: `cd backend && uv run uvicorn main:app --reload --port 8000`"

### 2. 서비스 연결 상태

`GET http://localhost:8000/api/settings/status` 호출하여 표시:
```
서비스 연결 상태:
- Claude: {status} — {message}
- OpenAI: {status} — {message}
- Supabase: {status} — {message}
- Search: {status} — {message}
```

### 3. 엔드포인트별 테스트

각 엔드포인트를 Bash `curl`로 호출하고, 응답 코드와 시간을 기록한다:

**Profile 그룹:**
- `GET /api/profile` → 200 또는 빈 배열
- `GET /api/profile/entries/{profile_id}` → 200 (profile_id가 있으면)

**Resume 그룹:**
- `GET /api/resume` → 200 + 배열
- `GET /api/resume/analyses` → 200 + 배열
- `GET /api/resume/research/files` → 200 + 배열

**Interview 그룹:**
- `GET /api/interview/questions/{resume_id}` → 200 (resume_id가 있으면)

**Settings 그룹:**
- `GET /api/settings` → 200 + 마스킹된 설정
- `GET /api/settings/status` → 200

### 4. 에러 핸들링 테스트

- `GET /api/resume/00000000-0000-0000-0000-000000000000` → 404 또는 null 확인
- `POST /api/resume/analyze-company` (빈 body) → 422 validation error 확인

### 5. 리포트 출력

```
## API Health Report

| Endpoint | Method | Status | Time | Notes |
|----------|--------|--------|------|-------|
| /api/settings/status | GET | 200 ✓ | 45ms | |
| /api/profile | GET | 200 ✓ | 89ms | 1 profile |
| /api/resume | GET | 200 ✓ | 67ms | 3 resumes |
| /api/resume/analyses | GET | 200 ✓ | 55ms | 5 analyses |
| /api/interview/questions/{id} | GET | 200 ✓ | 78ms | 5 questions |
| /api/settings | GET | 200 ✓ | 23ms | keys masked |
| /api/resume/{invalid} | GET | 404 ✓ | 12ms | error handling OK |
| /api/resume/analyze-company | POST | 422 ✓ | 8ms | validation OK |

Summary: 8/8 endpoints healthy
Services: Claude ✓, OpenAI ✓, Supabase ✓, Search ✓
```

## Error Handling

- **서버 미실행**: 시작 명령어 안내 후 중단
- **Supabase 미연결**: "[WARN] Supabase 미연결 — DB 관련 엔드포인트 스킵"
- **타임아웃**: 5초 내 응답 없으면 "[TIMEOUT]"으로 표시
