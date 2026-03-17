# 09. 실제 구현 계획서

## Phase 0: 환경 세팅 + 핵심 인프라 (2주)

### 사전 준비 체크리스트

```
□ Node.js 20+ 설치
□ Python 3.11+ 설치
□ pnpm 설치 (npm install -g pnpm)
□ uv 설치 (curl -LsSf https://astral.sh/uv/install.sh | sh)
□ Claude Code CLI 설치 + 로그인 (claude --version 확인)
□ Codex CLI 설치 + 로그인 (codex login → ~/.codex/auth.json 생성)
□ Supabase 계정 생성 + 프로젝트 생성
□ API 키 발급 (필요 시): Anthropic API Key 또는 OpenAI API Key
□ Brave Search API 키 발급 (무료, 선택)
```

### Step 0-1: 프로젝트 초기화

Claude Code에서 실행:
```
> "careerlab 프로젝트를 초기화해줘.
>  - Next.js 15 App Router + TypeScript + pnpm
>  - FastAPI + Python 3.11 + uv
>  - shadcn/ui 설치 (default 스타일)
>  - Tailwind CSS 설정
>  - Vercel AI SDK 설치
>  - CORS 설정 (localhost:3000 ↔ 8000)
>  - CLAUDE.md 생성"
```

### Step 0-2: Supabase 연결

```
> "Supabase 연결 설정해줘.
>  - frontend: @supabase/ssr + supabase-js
>    lib/supabase/client.ts, server.ts 생성
>  - backend: supabase-py
>    .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
>  - 환경변수 .env.local, .env 파일 템플릿 생성"
```

### Step 0-3: Supabase 스키마 생성

```
> "04-database-schema.md의 SQL을 Supabase 마이그레이션으로 만들어줘.
>  supabase/migrations/ 폴더에 저장.
>  pgvector 활성화 + 모든 테이블 + 시맨틱 검색 함수 포함."
```

### Step 0-4: dev.sh 스크립트

```bash
#!/bin/bash
# scripts/dev.sh — 프론트+백 동시 실행

echo "Starting CareerLab..."

# 백엔드
cd backend
uv run uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# 프론트엔드
cd ../frontend
pnpm dev &
FRONTEND_PID=$!

echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
```

### Phase 0 완료 기준
- [ ] `./scripts/dev.sh` 실행 시 양쪽 서버 정상 기동
- [ ] localhost:3000 접속 시 Next.js 기본 페이지 표시
- [ ] localhost:8000/docs 접속 시 FastAPI Swagger UI 표시
- [ ] Supabase 대시보드에서 테이블 생성 확인
- [ ] CLAUDE.md 프로젝트 루트에 존재
- [ ] Claude CLI 호출 성공 (claude -p 테스트)
- [ ] OpenAI API 호출 성공 (Codex CLI 또는 API Key)
- [ ] YAML 프롬프트 로드 + 변수 주입 동작
- [ ] 텍스트 → 벡터 임베딩 → Supabase 저장 → 검색 동작
- [ ] SSE 스트리밍 엔드포인트 응답 확인
- [ ] /settings 페이지에서 연결 상태 확인 가능
- [ ] LLM 호출 에러 시 재시도 동작

### Step 0-5: 인증 인프라

구현 완료 파일:
- `backend/core/claude_cli.py` — Claude CLI 브릿지 (`claude -p` subprocess)
- `backend/core/codex_cli.py` — Codex CLI 토큰 로더 (`~/.codex/auth.json`)
- `backend/core/oauth_loader.py` — OpenAI OAuth 토큰 관리
- `backend/core/app_settings.py` — 런타임 설정 (JSON 파일 기반)
- `backend/api/routes/settings.py` — 설정 API + 연결 상태 체크

Claude 인증: `cli` (기본, claude -p) 또는 `api_key` (Anthropic API Key)
OpenAI 인증: `codex_cli` (~/.codex/auth.json) 또는 `oauth` 또는 `api_key`

### Step 0-6: LLM 라우터

구현 완료: `backend/core/llm_router.py`
- TaskType enum으로 태스크별 모델 자동 선택
- Claude: auth_mode에 따라 CLI subprocess 또는 API 호출 분기
- OpenAI: Codex 토큰 / OAuth 토큰 / API Key 해석 후 OpenAI SDK 호출
- 스트리밍 지원 (SSE)
- tenacity exponential backoff (최대 3회, 30초)

### Step 0-7: 프롬프트 엔진

```
> "YAML 기반 프롬프트 엔진을 만들어줘.
>  backend/core/prompt_engine.py
>  - config/prompts/*.yaml 로드
>  - Jinja2 템플릿 변수 주입
>  - 시스템 프롬프트 + 유저 프롬프트 조립
>  - YAML에 metadata.version 필드 지원
>  - 기본 프롬프트 파일 4개 생성:
>    resume_gen.yaml, interview.yaml,
>    feedback.yaml, company_analysis.yaml"
```

### Step 0-8: 임베딩 엔진

```
> "벡터 임베딩 엔진을 만들어줘.
>  backend/core/embedding.py
>  - OpenAI text-embedding-3-small 호출
>  - 텍스트 → 1536차원 벡터 변환 (최대 2000자 제한)
>  - Supabase pgvector에 저장
>  - 시맨틱 검색 (match_career_entries RPC 호출)"
```

### Step 0-9: SSE 스트리밍 엔드포인트

```
> "채팅 스트리밍 엔드포인트를 만들어줘.
>  backend/api/routes/chat.py
>  - POST /api/chat/stream
>  - Claude Sonnet 스트리밍 응답 → SSE로 프론트에 전달
>  - Vercel AI SDK의 useChat과 호환되는 형식"
```

---

## Phase 1: 프로필 관리 (1주)

### Step 1-1: 백엔드 CRUD API

```
> "프로필 관리 API를 만들어줘.
>  backend/modules/profile/
>  - models.py: ProfileCreate, ProfileUpdate, CareerEntryCreate 등
>  - repository.py: Supabase CRUD (profiles + career_entries)
>  - service.py: 생성 시 자동 벡터 임베딩
>  backend/api/routes/profile.py
>  - GET /api/profile
>  - POST /api/profile
>  - PUT /api/profile/{id}
>  - POST /api/profile/entries (경력/프로젝트 추가)
>  - DELETE /api/profile/entries/{id}"
```

### Step 1-2: 이력서 파일 파싱

```
> "이력서 파일 업로드 + 파싱 기능을 만들어줘.
>  - POST /api/profile/upload
>  - PDF → 텍스트 추출 (pypdf2 or pdfplumber)
>  - DOCX → 텍스트 추출 (python-docx)
>  - 추출된 텍스트 → GPT-4o-mini로 구조화
>    (이름, 경력[], 프로젝트[], 스킬[] JSON 출력)
>  - 구조화된 데이터 → Supabase 저장
>  - 원본 파일 → Supabase Storage 업로드"
```

### Step 1-3: 프론트엔드 프로필 페이지

```
> "프로필 관리 페이지를 만들어줘.
>  frontend/app/profile/page.tsx
>  - 기본 정보 입력 폼 (shadcn/ui Form)
>  - 경력 사항 동적 추가/삭제 (배열 폼)
>  - 프로젝트 입력 (STAR 구조 가이드 포함)
>  - 역량 태그 입력
>  - 파일 업로드 드래그앤드롭
>  - 저장 시 Supabase + 벡터 임베딩"
```

### Step 1-4: 대화형 프로필 입력 (선택)

```
> "대화형 프로필 입력 기능을 만들어줘.
>  - 채팅 인터페이스에서 AI가 질문
>  - '어떤 회사에서 일하셨나요?' → 답변 → 후속 질문
>  - 답변에서 경력 데이터 자동 추출
>  - STAR 구조 유도 ('구체적 성과가 있나요?')
>  - 성과 정량화 유도 ('수치로 표현하면?')"
```

### Phase 1 완료 기준
- [ ] 프로필 생성/수정/삭제 동작
- [ ] 경력/프로젝트 추가/삭제 동작
- [ ] PDF/DOCX 업로드 → 자동 파싱 → DB 저장
- [ ] 프로필 페이지 UI 정상 렌더링
- [ ] 입력 데이터 벡터 임베딩 자동 생성

---

## Phase 2: 자소서 생성 (2~3주)

### Step 2-1: 기업 분석 모듈

```
> "기업 분석 모듈을 만들어줘.
>  backend/modules/resume/analyzer.py
>  - 채용공고 텍스트 입력 → GPT-4o-mini로 분석
>    - 핵심 요구사항 리스트
>    - 인재상/핵심가치
>    - 직무 키워드
>    - 자소서 문항 파악
>  - Brave Search로 기업 최신 뉴스 수집 (선택)
>  - 분석 결과 → company_analyses 테이블 저장
>  API: POST /api/resume/analyze-company"
```

### Step 2-2: 자소서 생성 파이프라인

```
> "자소서 생성 파이프라인을 만들어줘.
>  backend/modules/resume/generator.py
>  - 입력: company_analysis_id + 문항 + 옵션(톤, 글자수)
>  - pgvector 시맨틱 검색 → 매칭 경력 추출
>  - 프롬프트 조립 (resume_gen.yaml 템플릿)
>  - Claude Sonnet 스트리밍 생성
>  - 결과 → resumes + resume_items 저장
>  API: POST /api/resume/generate (SSE 스트리밍)"
```

### Step 2-3: 자소서 생성 UI

```
> "자소서 생성 페이지를 만들어줘.
>  frontend/app/resume/page.tsx — 목록
>  frontend/app/resume/[id]/page.tsx — 상세
>  
>  생성 플로우:
>  1. 기업 정보 입력 (채용공고 붙여넣기 or URL)
>  2. 기업 분석 결과 확인 (키워드, 인재상)
>  3. 매칭된 내 경력 확인 + 수동 선택 가능
>  4. 옵션 설정 (톤, 글자수, 강조점)
>  5. 생성 버튼 → 스트리밍으로 결과 표시
>  6. 문항별 편집 + 글자수 카운터
>  7. 버전 저장 + DOCX 내보내기 (선택)"
```

### Phase 2 완료 기준
- [ ] 채용공고 입력 → 기업 분석 결과 출력
- [ ] 기업 요구사항 ↔ 내 경력 시맨틱 매칭 동작
- [ ] 자소서 문항별 생성 (스트리밍)
- [ ] 톤/글자수 옵션 적용
- [ ] 자소서 저장 + 버전 관리

---

## Phase 3: 첨삭/피드백 (1주)

### Step 3-1: 첨삭 엔진

```
> "자소서 첨삭 엔진을 만들어줘.
>  backend/modules/resume/feedback.py
>  - 입력: resume_item (자소서 문항 1개)
>  - Claude Sonnet으로 4축 분석
>    (구조, 내용, 표현, 전략)
>  - 각 축 점수 (1~10) + 상세 피드백
>  - 수정 제안 리스트
>  - 수정본 자동 생성
>  - feedback_reports 테이블 저장
>  API: POST /api/review/analyze"
```

### Step 3-2: 첨삭 UI

```
> "첨삭 페이지를 만들어줘.
>  frontend/app/review/page.tsx
>  - 자소서 선택 → 문항 선택
>  - 4축 점수 레이더 차트 (recharts)
>  - 수정 제안 인라인 표시
>  - 원본 vs 수정본 diff 뷰어 (side by side)
>  - 수정본 적용 버튼"
```

### Phase 3 완료 기준
- [ ] 자소서 문항 분석 → 4축 점수 출력
- [ ] 수정 제안 + 수정본 생성
- [ ] diff 뷰어 동작
- [ ] 레이더 차트 렌더링

---

## Phase 4: 면접 코칭 (2주)

### Step 4-1: 예상질문 생성

```
> "면접 예상질문 생성 모듈을 만들어줘.
>  backend/modules/interview/question_gen.py
>  - 입력: resume_id (자소서 + 기업 분석)
>  - Claude Haiku로 카테고리별 질문 생성
>    (자소서기반, 역량, 기업맞춤, 인성, 압박)
>  - 질문별 답변 가이드 (내 경력 데이터 기반)
>  - interview_questions 테이블 저장
>  API: POST /api/interview/generate-questions"
```

### Step 4-2: 모의면접 채팅

```
> "모의면접 채팅 기능을 만들어줘.
>  backend/modules/interview/mock.py + api/routes/interview.py
>  - POST /api/interview/mock/start (세션 생성)
>  - POST /api/interview/mock/chat (SSE 스트리밍)
>  - POST /api/interview/mock/end (세션 종료 + 평가)
>  
>  면접관 AI 시스템 프롬프트:
>  - 자소서 + 기업 정보를 기반으로 질문
>  - 모드별 행동 (일반/압박/PT)
>  - 답변에 따라 꼬리질문 생성
>  - 각 답변에 내부 메모 (점수, 피드백)
>  
>  frontend/app/interview/mock/page.tsx
>  - Vercel AI SDK useChat 기반 채팅 UI
>  - 면접 모드 선택 (일반/압박/PT)
>  - 면접관/지원자 말풍선 구분
>  - 면접 종료 버튼"
```

### Step 4-3: 면접 평가 리포트

```
> "면접 평가 리포트 기능을 만들어줘.
>  backend/modules/interview/evaluator.py
>  - 모의면접 세션 종료 시 자동 호출
>  - Claude Sonnet으로 전체 대화 분석
>  - 답변별: 점수 + 피드백 + 모범답변
>  - 종합: 총점 + 강점 + 약점 + 개선 우선순위
>  - mock_sessions.evaluation에 저장
>  
>  frontend 결과 페이지:
>  - 답변별 점수 타임라인
>  - 강점/약점 요약
>  - 답변 원문 + 모범답변 비교"
```

### Phase 4 완료 기준
- [ ] 예상질문 5개 카테고리 생성
- [ ] 모의면접 채팅 (스트리밍) 동작
- [ ] 면접 모드 3종 (일반/압박/PT) 동작
- [ ] 세션 종료 → 평가 리포트 자동 생성
- [ ] 평가 결과 UI 렌더링

---

## Phase 5: 고도화 (1~2주)

### Step 5-1: 대시보드

```
> "메인 대시보드를 만들어줘.
>  frontend/app/page.tsx
>  - 지원 현황 카드 (진행중/합격/불합격)
>  - 최근 생성한 자소서 목록
>  - 면접 준비 상태 (질문 생성됨/모의면접 완료)
>  - 프로필 완성도 프로그레스 바
>  - 빠른 액션 버튼들"
```

### Step 5-2: Claude Desktop 리서치 연동

```
> "Claude Desktop 리서치 결과 연동 기능을 만들어줘.
>  - 설정 페이지에서 리서치 폴더 경로 지정
>    (기본: ~/Documents/career/research/)
>  - 폴더 내 .md 파일 목록 표시
>  - 선택한 파일 내용 → company_analyses에 저장
>  - 자소서 생성 시 리서치 데이터 자동 참조"
```

### Step 5-3: DOCX 내보내기

```
> "자소서 DOCX 내보내기 기능을 만들어줘.
>  - 자소서 상세 페이지에서 '내보내기' 버튼
>  - python-docx로 포맷팅된 DOCX 생성
>  - 기업명, 문항, 답변 포함
>  - Supabase Storage에 저장 + 다운로드 링크"
```

### Step 5-4: 프롬프트 튜닝

```
실제 사용하면서 지속적으로:
- 자소서 품질 확인 → 프롬프트 수정
- 면접 질문 적절성 확인 → 프롬프트 수정
- 첨삭 정확도 확인 → 분석 기준 조정
- 합격/불합격 결과 기록 → 패턴 분석
```

### Phase 5 완료 기준
- [ ] 대시보드 메인 페이지 완성
- [ ] 리서치 파일 연동 동작
- [ ] DOCX 내보내기 동작
- [ ] 전체 기능 E2E 테스트 통과

---

## Claude Code 실행 순서 요약

```bash
# Phase 0: 환경 세팅 + 핵심 인프라
claude
> "CLAUDE.md 읽고 careerlab 프로젝트 세팅해줘"
> "Supabase 연결하고 스키마 마이그레이션 만들어줘"
> "OAuth 토큰 로더 만들어줘"
> "LLM 라우터 만들어줘 (에러 핸들링 + 재시도 포함)"
> "프롬프트 엔진 만들어줘 (YAML version 필드 지원)"
> "임베딩 엔진 만들어줘"
> "SSE 스트리밍 채팅 엔드포인트 만들어줘"

# Phase 1: 프로필 관리
> "프로필 CRUD API + Supabase 연동 만들어줘"
> "이력서 파일 업로드 파싱 만들어줘"
> "프로필 관리 프론트 페이지 만들어줘"

# Phase 2: 자소서 생성
> "기업 분석 모듈 만들어줘"
> "자소서 생성 파이프라인 만들어줘"
> "자소서 생성 페이지 만들어줘"

# Phase 3: 첨삭/피드백
> "자소서 첨삭 엔진 만들어줘"
> "첨삭 페이지 + diff 뷰어 만들어줘"

# Phase 4: 면접 코칭
> "면접 예상질문 생성 만들어줘"
> "모의면접 채팅 만들어줘"
> "면접 평가 리포트 만들어줘"

# Phase 5: 고도화
> "대시보드 만들어줘"
> "리서치 파일 연동 만들어줘"
> "DOCX 내보내기 만들어줘"
```

## 변경 이력 (Phase 구조)

| 변경 전 | 변경 후 | 사유 |
|---------|---------|------|
| Phase 0 (환경) + Phase 1 (인프라) 별도 | Phase 0 (환경+인프라) 통합 | 환경 세팅만으로 1주는 과도 |
| Phase 3 자소서 생성 (2주) | Phase 2 자소서 생성 (2~3주) | 기업분석+생성+UI 포함 시 여유 필요 |
| 총 7개 Phase (0~6) | 총 6개 Phase (0~5) | 구조 효율화 |
