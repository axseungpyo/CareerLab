# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: CareerLab
AI 커리어 컨설팅 에이전트. 자소서 생성, 면접 코칭, 자소서 첨삭, 취업 지원관리(칸반/캘린더), 기업 분석을 제공하는 로컬 웹 앱. v0.7 — 삼성 양식 프로필 포함.

## Architecture
- **Frontend**: Next.js 15 App Router + TypeScript (localhost:3000)
- **Backend**: FastAPI Python 3.11+ (localhost:8000)
- **Communication**: REST + SSE (LLM 스트리밍)
- **DB**: Supabase (PostgreSQL + pgvector 1536차원 + Storage)
- **LLM**: Claude CLI/API Key (자소서/면접/첨삭) + OpenAI Codex CLI/OAuth/API Key (파싱/임베딩)
- **Search**: Tavily / Perplexity Sonar (기업 정보 검색, Settings UI에서 선택)
- **Settings**: 런타임 설정 UI (`/settings`) — API Key, 인증 모드, 기능 스위치 관리

## Build & Run Commands
```bash
# 프론트+백 동시 실행
./scripts/dev.sh

# 프론트엔드만
cd frontend && pnpm dev

# 백엔드만
cd backend && uv run uvicorn main:app --reload --port 8000

# 프론트엔드 타입체크
cd frontend && npx tsc --noEmit

# 백엔드 테스트
cd backend && python -m pytest tests/ -q

# 패키지 설치
cd frontend && pnpm install
cd backend && uv pip install -r requirements.txt

# Supabase 마이그레이션
supabase db push
```

## Directory Structure
```
frontend/           Next.js 15, pnpm, shadcn/ui, Tailwind, Vercel AI SDK
  app/              App Router 페이지 (/profile, /resume, /interview, /review, /settings, /applications, /company)
  components/       ui/(shadcn), profile/(12개 탭/폼 컴포넌트), navigation, theme
  lib/supabase/     client.ts(브라우저), server.ts(서버 컴포넌트)
  lib/api.ts        FastAPI 통신 클라이언트 (REST + SSE 스트리밍 + 파일 업로드)

backend/            FastAPI, uv
  api/routes/       profile.py, resume.py, interview.py, chat.py(SSE), settings.py,
                    application.py, company.py, stats.py
  core/             llm_router.py, claude_cli.py, codex_cli.py, oauth_loader.py,
                    app_settings.py, prompt_engine.py, embedding.py, research.py
  modules/          profile/(connectors/ 포함), resume/, interview/, application/
                    (각각 models/service/repository 패턴)
  config/prompts/   YAML 프롬프트 템플릿 (Jinja2 변수 주입)
  data/             app_settings.json (런타임 설정 — gitignore)

supabase/           migrations/, seed.sql
```

## Key Architecture Patterns

### LLM Routing
태스크별 모델 자동 선택 — `backend/core/llm_router.py`에서 TaskType enum으로 라우팅:
- Claude Sonnet 4 (CLI/API Key): 자소서 생성, 첨삭, 모의면접
- Claude Haiku 4.5 (CLI/API Key): 예상질문 생성
- GPT-4o-mini (Codex CLI/OAuth/API Key): 기업 분석, 이력서 파싱
- text-embedding-3-small (Codex CLI/OAuth/API Key): 벡터 임베딩

### Auth Modes
인증 설정은 `/settings` 페이지 또는 `backend/data/app_settings.json`에서 관리.
키 해석 우선순위: `설정 UI 입력값` → `OAuth/CLI 토큰` → `.env 환경변수`

**Claude (2가지):**
| 모드 | 설명 | 파일 |
|------|------|------|
| `cli` (기본) | `claude -p` 로컬 CLI 호출, 구독 인증 자동 사용 | `core/claude_cli.py` |
| `api_key` | Anthropic API Key 직접 입력 (`x-api-key` 헤더) | `core/llm_router.py` |

**OpenAI (3가지):**
| 모드 | 설명 | 파일 |
|------|------|------|
| `codex_cli` | `~/.codex/auth.json`에서 ChatGPT OAuth 토큰 추출 → OpenAI SDK 주입 | `core/codex_cli.py` |
| `oauth` | `~/.openai/.credentials.json` 토큰 파일 로드 | `core/oauth_loader.py` |
| `api_key` | OpenAI API Key 직접 입력 | `core/llm_router.py` |

### Web Search
멀티 프로바이더 기업 정보 검색 — `backend/core/research.py`
- Tavily (기본): 3카테고리 병렬 검색 (사업모델/문화/전략)
- Perplexity Sonar (대체): AI 기반 딥서치
- 프로바이더 선택: `/settings` UI에서 설정

### Data Flow — 자소서 생성
채용공고 입력 → GPT-4o-mini 분석 (Tavily 웹서치 병행) → pgvector 시맨틱 매칭(내 경력) → YAML 프롬프트 조립 → Claude Sonnet 스트리밍 생성

### Prompt System
프롬프트는 `backend/config/prompts/*.yaml`에 YAML 템플릿으로 관리. `prompt_engine.py`가 Jinja2로 변수 주입하여 시스템/유저 프롬프트 조립.

### Runtime Settings
`backend/core/app_settings.py` — JSON 파일 기반 런타임 설정. API로 CRUD 가능.
`GET/PUT /api/settings` — 설정 조회/수정 (API Key는 마스킹 처리)
`GET /api/settings/status` — Claude/OpenAI/Supabase/Search(Tavily|Perplexity) 연결 상태 확인

### Error Handling
LLM 호출 실패 시 `tenacity` 기반 exponential backoff (최대 3회, 30초 제한).
에러 메시지는 한국어로 프론트에 전달.

## Coding Rules

### Frontend
- TypeScript strict mode, function 선언 + default export
- Tailwind 유틸리티 우선, shadcn/ui 컴포넌트
- Vercel AI SDK `useChat`으로 채팅/스트리밍 구현
- Supabase: `@supabase/ssr`(서버), `supabase-js`(클라이언트)
- 한국어 UI (i18n 불필요)

### Backend
- Python 타입힌트 필수, Pydantic v2 모델
- async def 기본, httpx로 비동기 HTTP
- 모듈 구조: models.py / service.py / repository.py
- DB 접근은 supabase-py 클라이언트만 사용

### Common
- 커밋: conventional commits (feat:, fix:, refactor:)
- 에러 메시지: 한국어, docstring: 영문

### Agent 활용 전략 — 팀에이전트 우선

**팀에이전트 (PDCA Team Mode, 기본 작업 방식)**
- `/pdca team {feature}` 명령으로 시작
- 환경변수: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 필수
- CTO Lead (Opus)가 전체 PDCA 사이클 오케스트레이션
- Dynamic: 3명 (developer, frontend, qa) — 일반 기능 구현
- Enterprise: 5명 (architect, developer, qa, reviewer, security) — 대규모/보안

**사용 시점 (기본 — 모든 기능 구현에 우선 적용):**
- 새 기능 구현 (백엔드 + 프론트엔드 + 테스트 전체)
- 여러 모듈에 걸친 리팩토링/개선
- PDCA 반복 개선 (병렬 수정)
- 아키텍처 리뷰 + 구현 동시 진행
- Match Rate < 70% 시 병렬 iteration

**서브에이전트 (Agent 도구, 보조)**
- 단일 파일 수정, 간단한 버그 수정 등 소규모 작업
- 코드베이스 탐색 (`subagent_type=Explore`)
- 빠른 코드 리뷰, Gap 분석 (전문 에이전트)
- 독립 백그라운드 작업 (`run_in_background=true`)

**사용 시점 (보조 — 팀 구성이 과도한 경우만):**
- 파일 1~2개 수정하는 단순 작업
- 코드베이스 탐색/검색
- 단순 버그 수정, 오타 수정

## Database Tables
profiles, career_entries(벡터 포함), company_analyses, resumes, resume_items, interview_questions, mock_sessions, mock_messages, feedback_reports, applications, courses, language_tests, certifications, awards

벡터 검색은 `match_career_entries` RPC 함수 사용 (cosine similarity, threshold 0.7).

## Environment Variables
```
# backend/.env (설정 UI에서도 입력 가능 — UI 우선)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
TAVILY_API_KEY=...  # 또는 Settings UI에서 설정
APP_ENV=development
FRONTEND_URL=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development Tools
- **Claude Code CLI**: 백엔드 + 프롬프트 개발 (구독 인증 → 런타임 LLM 호출에도 사용)
- **Codex CLI**: 프론트엔드 개발 (ChatGPT 인증 → 런타임 OpenAI 호출에도 사용)
- **Claude Desktop**: 기업 심층 리서치 (수동, ~/Documents/career/research/ 저장)

## Testing
통합 테스트 중심. pytest + pytest-asyncio + respx(LLM 모킹).
```bash
cd backend && python -m pytest tests/ -v                          # 전체
cd backend && python -m pytest tests/test_llm_router.py -v        # 단일 파일
cd backend && python -m pytest tests/ --cov=. --cov-report=term   # 커버리지
```

## Prompt Versioning
YAML 프롬프트 파일에 `metadata.version` (semver) + `changelog` 필드 포함.
Git diff로 변경 추적. 프롬프트 수정 시 반드시 version 업데이트.

## Data Backup
```bash
supabase db dump -f backup_$(date +%Y%m%d).sql    # DB 백업
supabase db reset && psql $DATABASE_URL < backup.sql  # 복원
```

## Implementation History
| Phase | 버전 | 내용 | 상태 |
|-------|------|------|------|
| 0~5 | v0.1 | 환경세팅, 프로필, 자소서, 첨삭, 면접, 대시보드 | 완료 |
| 6 | v0.2 | Settings UI, 인증 모드, 다크모드 | 완료 |
| 7 | v0.3 | UX 리디자인, 모바일, 스켈레톤 | 완료 |
| 8 | v0.4 | 대시보드 통계, 면접 상세 결과, PDF/CSV 내보내기 | 완료 |
| 9 | v0.5 | DataConnector (File/Notion), 가져오기 UI | 완료 |
| 10 | v0.6 | 지원관리 칸반, URL 파싱, 캘린더, 기업분석 허브 | 완료 |
| 11 | v0.7 | 삼성 양식 프로필 (7탭, 확장 필드), 프롬프트 v2.0 | 완료 |
| 12 | v0.8 | 안정화/리팩토링/문서 정리 | **진행중** |
