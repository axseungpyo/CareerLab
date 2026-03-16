# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: CareerLab
AI 커리어 컨설팅 에이전트. 이력/경력 데이터 기반 맞춤 자소서 생성, 면접 코칭, 자소서 첨삭을 제공하는 로컬 웹 앱.

## Architecture
- **Frontend**: Next.js 15 App Router + TypeScript (localhost:3000)
- **Backend**: FastAPI Python 3.11+ (localhost:8000)
- **Communication**: REST + SSE (LLM 스트리밍)
- **DB**: Supabase (PostgreSQL + pgvector 1536차원 + Storage)
- **LLM**: Claude CLI/API Key (자소서/면접/첨삭) + OpenAI Codex CLI/OAuth/API Key (파싱/임베딩)
- **Search**: Brave Search API (기업 정보)
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
  app/              App Router 페이지 (/profile, /resume, /interview, /review, /settings)
  components/       ui/(shadcn), chat/, profile/, resume/
  lib/supabase/     client.ts(브라우저), server.ts(서버 컴포넌트)
  lib/api.ts        FastAPI 통신 클라이언트 (REST + SSE 스트리밍 + 파일 업로드)

backend/            FastAPI, uv
  api/routes/       profile.py, resume.py, interview.py, chat.py(SSE), settings.py
  core/             llm_router.py, claude_cli.py, codex_cli.py, oauth_loader.py,
                    app_settings.py, prompt_engine.py, embedding.py, research.py
  modules/          profile/, resume/, interview/ (각각 models/service/repository 패턴)
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

### Data Flow — 자소서 생성
채용공고 입력 → GPT-4o-mini 분석 → pgvector 시맨틱 매칭(내 경력) → YAML 프롬프트 조립 → Claude Sonnet 스트리밍 생성

### Prompt System
프롬프트는 `backend/config/prompts/*.yaml`에 YAML 템플릿으로 관리. `prompt_engine.py`가 Jinja2로 변수 주입하여 시스템/유저 프롬프트 조립.

### Runtime Settings
`backend/core/app_settings.py` — JSON 파일 기반 런타임 설정. API로 CRUD 가능.
`GET/PUT /api/settings` — 설정 조회/수정 (API Key는 마스킹 처리)
`GET /api/settings/status` — Claude/OpenAI/Supabase/Brave 연결 상태 확인

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

### Agent 활용
- 동시 태스크 진행 시 반드시 Agent 도구의 서브에이전트를 활용하여 병렬 작업 수행
- 독립적인 백엔드/프론트엔드 작업은 서브에이전트로 병렬 실행
- 코드 리뷰, Gap 분석 등은 전문 에이전트(code-reviewer, gap-detector) 활용

## Database Tables
profiles, career_entries(벡터 포함), company_analyses, resumes, resume_items, interview_questions, mock_sessions, mock_messages, feedback_reports

벡터 검색은 `match_career_entries` RPC 함수 사용 (cosine similarity, threshold 0.7).

## Environment Variables
```
# backend/.env (설정 UI에서도 입력 가능 — UI 우선)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
BRAVE_API_KEY=...
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

## Implementation Phases
0. 환경 세팅+핵심 인프라 → 1. 프로필 CRUD → 2. 자소서 생성 → 3. 첨삭/피드백 → 4. 면접 코칭 → 5. 대시보드/고도화
