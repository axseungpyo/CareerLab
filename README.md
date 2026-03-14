# CareerLab

AI 커리어 컨설팅 에이전트 — 이력/경력 데이터 기반 맞춤 자소서 생성, 면접 코칭, 자소서 첨삭을 제공하는 로컬 웹 앱.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **프로필 관리** | 경력/프로젝트 CRUD, STAR 구조, 이력서 파일(PDF/DOCX) 파싱 |
| **자소서 생성** | 채용공고 분석 → pgvector 경력 매칭 → Claude AI 맞춤 생성 (SSE 스트리밍) |
| **자소서 첨삭** | 4축 분석 (구조/내용/표현/전략), 수정 제안, 수정본 자동 적용 |
| **면접 코칭** | 예상질문 생성, 모의면접 채팅 (일반/압박/PT 모드), AI 종합 평가 |
| **설정 관리** | LLM/Supabase/Brave 연결, 기능 스위치, 다크/라이트 테마 |

## 아키텍처

```
Frontend (Next.js 15)          Backend (FastAPI)
localhost:3000            ───→  localhost:8000
  App Router                     api/routes/
  shadcn/ui + Tailwind           core/ (LLM Router, Prompt Engine)
  SSE 스트리밍                    modules/ (profile, resume, interview)

                    ↕                        ↕
              Supabase                  Claude / OpenAI
         PostgreSQL + pgvector       CLI 또는 API Key
```

### LLM 라우팅

| 태스크 | 모델 | 인증 방식 |
|--------|------|-----------|
| 자소서 생성/첨삭/모의면접 | Claude Sonnet 4 | CLI / API Key |
| 예상질문 생성 | Claude Haiku 4.5 | CLI / API Key |
| 기업 분석, 파일 파싱 | GPT-4o-mini | Codex CLI / OAuth / API Key |
| 벡터 임베딩 | text-embedding-3-small | Codex CLI / OAuth / API Key |

### 인증 모드

**Claude**: `claude -p` CLI (구독 인증) 또는 Anthropic API Key
**OpenAI**: Codex CLI (`~/.codex/auth.json`) / OAuth 토큰 / API Key

## 시작하기

### 사전 요구사항

- Node.js 20+, pnpm
- Python 3.11+, uv
- Supabase 프로젝트
- Claude Code CLI 또는 Anthropic API Key
- (선택) Codex CLI, Brave Search API Key

### 설치

```bash
# 클론
git clone https://github.com/axseungpyo/CareerLab.git
cd CareerLab

# 패키지 설치
cd frontend && pnpm install && cd ..
cd backend && pip install -r requirements.txt && cd ..

# 환경변수 (또는 /settings 페이지에서 입력)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# → .env 파일에 Supabase URL/키 등 입력

# DB 스키마 적용
supabase db push
```

### 실행

```bash
# 동시 실행
./scripts/dev.sh

# 또는 별도 실행
cd backend && uvicorn main:app --reload --port 8000
cd frontend && pnpm dev
```

| URL | 설명 |
|-----|------|
| http://localhost:3000 | 프론트엔드 |
| http://localhost:3000/settings | 설정 (API 키/연결 관리) |
| http://localhost:8000/docs | Swagger API 문서 |

### 사용 순서

1. `/settings` → API 키 입력 및 연결 확인
2. `/profile` → 프로필 작성 또는 이력서 파일 업로드
3. `/resume/new` → 채용공고 붙여넣기 → AI 자소서 생성
4. `/review` → 생성된 자소서 4축 첨삭 분석
5. `/interview` → 예상질문 생성 → 모의면접 채팅 → 평가

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | FastAPI, Python 3.11+, Pydantic v2 |
| Database | Supabase (PostgreSQL + pgvector 1536차원) |
| LLM | Claude Sonnet 4 / Haiku 4.5, GPT-4o-mini, text-embedding-3-small |
| Search | Brave Search API |
| Streaming | SSE (Server-Sent Events), Vercel AI SDK 호환 |

## 프로젝트 구조

```
frontend/
  app/              페이지 (/, /profile, /resume, /interview, /review, /settings)
  components/       ui/ (shadcn), profile/, navigation, theme-provider
  lib/              api.ts, types.ts, supabase/

backend/
  api/routes/       profile, resume, interview, chat, settings
  core/             llm_router, claude_cli, codex_cli, prompt_engine, embedding
  modules/          profile/, resume/, interview/ (models/service/repository)
  config/prompts/   YAML 프롬프트 템플릿 (Jinja2)
  tests/            pytest 통합 테스트

supabase/
  migrations/       DB 스키마 (9 테이블 + pgvector + RPC)
```

## 테스트

```bash
cd backend && python -m pytest tests/ -v          # 백엔드 테스트
cd frontend && npx tsc --noEmit                    # 프론트엔드 타입체크
```

## 라이선스

Private project.
