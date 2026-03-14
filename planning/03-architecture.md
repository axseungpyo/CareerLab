# 03. 시스템 아키텍처

## 전체 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────────┐
│                    localhost:3000 (Next.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────────┐  │
│  │ 프로필   │ │ 자소서   │ │ 면접 코칭 │ │ 첨삭/피드백   │  │
│  │ /profile │ │ /resume  │ │/interview │ │ /review       │  │
│  └──────────┘ └──────────┘ └───────────┘ └───────────────┘  │
│       shadcn/ui + Tailwind + Vercel AI SDK (useChat)         │
│       @supabase/ssr (서버사이드) + supabase-js (클라이언트)  │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST + SSE (스트리밍)
┌───────────────────────────▼──────────────────────────────────┐
│                    localhost:8000 (FastAPI)                    │
│                                                               │
│  ┌─────────────────── API Routes ──────────────────────────┐  │
│  │  /api/profile  /api/resume  /api/interview  /api/chat   │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                     │
│  ┌──────────────────────▼──────────────────────────────────┐  │
│  │                   Core Engine                            │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │  │
│  │  │ LLM Router   │ │ Prompt       │ │ Research       │  │  │
│  │  │ Claude CLI   │ │ Engine       │ │ Engine         │  │  │
│  │  │ + OpenAI API │ │ YAML 템플릿  │ │ Brave Search   │  │  │
│  │  └──────────────┘ └──────────────┘ └────────────────┘  │  │
│  │                                                          │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │  │
│  │  │ Auth Manager │ │ Embedding    │ │ App Settings │    │  │
│  │  │ claude_cli   │ │ Engine       │ │ JSON 설정    │    │  │
│  │  │ codex_cli    │ │ OpenAI →     │ │ /settings UI │    │  │
│  │  │ oauth_loader │ │ pgvector     │ │              │    │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────── Modules ──────────────────────────────┐  │
│  │  profile/     resume/      interview/                    │  │
│  │  service.py   generator.py question_gen.py               │  │
│  │  parser.py    analyzer.py  mock.py                       │  │
│  │  repo.py      feedback.py  evaluator.py                  │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                     │
│  ┌──────────────────────▼──────────────────────────────────┐  │
│  │              Supabase Client (supabase-py)               │  │
│  └──────────────────────┬──────────────────────────────────┘  │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                    Supabase (클라우드)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │ PostgreSQL   │ │ pgvector     │ │ Storage               │ │
│  │ 구조화 데이터│ │ 벡터 임베딩  │ │ 이력서/자소서 파일     │ │
│  └──────────────┘ └──────────────┘ └───────────────────────┘ │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│  외부 연동                                                     │
│  Claude Desktop 리서치 → 파일 저장 → 앱이 읽기 (수동)         │
│  Brave Search API → 기업 정보 실시간 검색 (자동)               │
│  Google Drive → 기존 이력서 가져오기 (선택)                     │
└───────────────────────────────────────────────────────────────┘
```

## 디렉토리 구조

```
careerlab/
├── CLAUDE.md                          # Claude Code 프로젝트 컨텍스트
├── README.md
├── .gitignore
│
├── .claude/                           # Claude Code 확장
│   ├── settings.json                  # 훅 설정
│   ├── agents/                        # 서브에이전트
│   │   ├── researcher.md
│   │   ├── code-reviewer.md
│   │   └── schema-designer.md
│   └── skills/                        # 스킬
│       ├── resume-prompt-tuning.md
│       ├── supabase-schema.md
│       └── component-pattern.md
│
├── frontend/                          # Next.js 15
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # 대시보드
│   │   ├── profile/page.tsx
│   │   ├── resume/
│   │   │   ├── page.tsx               # 자소서 목록
│   │   │   └── [id]/page.tsx          # 자소서 상세
│   │   ├── interview/
│   │   │   ├── page.tsx               # 면접 코칭 메인
│   │   │   └── mock/page.tsx          # 모의면접 채팅
│   │   └── review/page.tsx            # 첨삭
│   ├── components/
│   │   ├── ui/                        # shadcn/ui
│   │   ├── chat/                      # 채팅 컴포넌트
│   │   ├── profile/                   # 프로필 폼
│   │   └── resume/                    # 자소서 에디터, diff 뷰어
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # 브라우저용
│   │   │   └── server.ts              # 서버 컴포넌트용
│   │   ├── api.ts                     # FastAPI 통신
│   │   └── types.ts                   # 공유 타입
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/                           # FastAPI
│   ├── main.py                        # 앱 엔트리
│   ├── api/routes/
│   │   ├── profile.py
│   │   ├── resume.py
│   │   ├── interview.py
│   │   └── chat.py                    # SSE 스트리밍
│   ├── core/
│   │   ├── llm_router.py              # 멀티 LLM 라우팅
│   │   ├── claude_cli.py              # Claude CLI 브릿지 (claude -p)
│   │   ├── codex_cli.py              # Codex CLI 토큰 로더 (~/.codex/auth.json)
│   │   ├── oauth_loader.py           # OpenAI OAuth 토큰 관리
│   │   ├── app_settings.py           # 런타임 설정 (JSON 기반)
│   │   ├── prompt_engine.py           # YAML 프롬프트 조립
│   │   ├── embedding.py               # OpenAI 임베딩 → pgvector
│   │   └── research.py                # Brave Search 기업 리서치
│   ├── modules/
│   │   ├── profile/
│   │   │   ├── models.py              # Pydantic 모델
│   │   │   ├── service.py             # 비즈니스 로직
│   │   │   ├── repository.py          # Supabase CRUD
│   │   │   └── parser.py              # 이력서 파싱
│   │   ├── resume/
│   │   │   ├── models.py
│   │   │   ├── generator.py           # 자소서 생성
│   │   │   ├── analyzer.py            # 기업 분석
│   │   │   └── feedback.py            # 첨삭
│   │   └── interview/
│   │       ├── models.py
│   │       ├── question_gen.py        # 예상질문
│   │       ├── mock.py                # 모의면접
│   │       └── evaluator.py           # 평가
│   ├── config/
│   │   ├── settings.py
│   │   └── prompts/                   # YAML 프롬프트 템플릿
│   │       ├── resume_gen.yaml
│   │       ├── interview.yaml
│   │       ├── feedback.yaml
│   │       └── company_analysis.yaml
│   ├── requirements.txt
│   └── .env
│
├── supabase/                          # Supabase 로컬 설정
│   ├── migrations/                    # SQL 마이그레이션
│   └── seed.sql                       # 초기 데이터
│
└── scripts/
    ├── setup.sh                       # 초기 환경 세팅
    └── dev.sh                         # 프론트+백 동시 실행
```

## 데이터 흐름

### 자소서 생성 플로우

```
[1] 사용자: 기업명 + 채용공고 입력
         │
[2] Brave Search → 기업 뉴스/정보 수집
    + Claude Desktop 리서치 파일 읽기 (있으면)
         │
[3] GPT-4o-mini → 채용공고 구조화 분석
    (요구사항, 인재상, 키워드 추출)
         │
[4] pgvector → 내 경력과 시맨틱 매칭
    (기업 요구 ↔ 내 경험 유사도 검색)
         │
[5] Prompt Engine → 프롬프트 조립
    (기업분석 + 매칭경력 + 문항 + 옵션)
         │
[6] Claude Sonnet → 자소서 초안 생성 (스트리밍)
         │
[7] Supabase → 결과 저장 (버전 관리)
```

### 모의면접 플로우

```
[1] 자소서 + 채용공고 로드
         │
[2] Claude Haiku → 예상질문 20개 생성
         │
[3] 사용자: 모의면접 시작
         │
[4] Claude Sonnet (스트리밍 채팅)
    면접관 역할 → 질문 → 사용자 답변 → 꼬리질문
         │
[5] 세션 종료 후
    Claude Sonnet → 답변별 피드백 + 종합 평가
         │
[6] Supabase → 세션/평가 저장
```
