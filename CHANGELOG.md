# Changelog

CareerLab 버전별 변경사항 기록.

---

## v0.3.0 — UI/UX 리디자인 (2026-03-15)

### 추가
- **Dark/Light 모드**: `next-themes` ThemeProvider + Sun/Moon 토글 버튼
- **히어로 섹션**: 홈 상단 그라데이션 배너 + CTA 버튼 (자소서 시작/프로필 작성)
- **글래스모피즘 카드**: `glass-card` 유틸리티 (backdrop-blur + 반투명 배경)
- **Empty State 컴포넌트**: 재사용 가능한 빈 상태 (아이콘 + 설명 + CTA)
- **스켈레톤 로딩**: shadcn `skeleton` 컴포넌트로 로딩 UI 개선
- **모바일 하단 탭바**: 768px 이하에서 fixed bottom navigation

### 변경
- **네비게이션**: lucide 아이콘 추가, active 상태 하단 인디케이터 바, 메뉴 간격 확대
- **홈 대시보드**: ring progress (프로필 완성도), 지원 현황 숫자 색상 구분
- **설정 페이지**: 사이드바+콘텐츠 레이아웃, 좌측 gradient 인디케이터, 4개 탭 (연결/기능/테마/정보)
- **프로필 폼**: 라벨-입력 간격 개선 (`space-y-1.5`), 학력 삭제(X) 버튼 추가
- **파일 업로드**: gradient 아이콘 박스, 드래그 scale 애니메이션
- **자소서 생성**: 위저드 스텝 연결선 추가, 라벨-입력 간격 개선
- **채팅 말풍선**: 모의면접 candidate 말풍선 indigo→violet 그라데이션
- **글로벌 스타일**: primary 컬러 neutral → indigo(oklch 270), radius 0.625→0.75rem

### 다크모드 호환
- 모든 하드코딩 색상에 `dark:` variant 추가 (review, interview, settings)
- 카드 배경에 미세 보라빛 tint (`oklch 0.205 0.005 270`)
- StatusMessage 컴포넌트: `bg-green-50 dark:bg-green-950` 등 전체 대응

---

## v0.2.0 — 인증 아키텍처 변경 (2026-03-15)

### 추가
- **Codex CLI 토큰 로더** (`core/codex_cli.py`): `~/.codex/auth.json`에서 ChatGPT OAuth 토큰 추출
- **런타임 설정 시스템** (`core/app_settings.py`): JSON 파일 기반, API로 CRUD 가능
- **Claude CLI 브릿지** (`core/claude_cli.py`): `claude -p` subprocess 호출, 스트리밍 지원
- **설정 API** (`api/routes/settings.py`): GET/PUT + 연결 상태 체크 + 키 마스킹
- **설정 웹 UI** (`/settings`): 서비스별 연결 관리, Supabase 키 입력, 기능 스위치

### 변경
- **Claude 인증**: OAuth 제거 (Anthropic 제3자 차단) → CLI + API Key 2가지
- **OpenAI 인증**: Codex CLI + OAuth + API Key 3가지로 확장
- **LLM 라우터**: `Provider.claude_oauth` → `Provider.claude` 리네임
- **키 해석 우선순위**: 설정 UI → CLI/OAuth 토큰 → .env 환경변수

### 삭제
- Claude OAuth 관련 코드 (`get_claude_oauth`, `reset_claude_oauth`)
- 하위호환 함수 (`get_oauth_manager`, `reset_oauth_manager`)

### 문서
- `CLAUDE.md`: Auth Modes 섹션 전면 교체, 디렉토리 구조 갱신
- `planning/02-tech-stack.md`: 인증 방식 테이블 업데이트
- `planning/03-architecture.md`: 아키텍처 다이어그램 수정
- `planning/09-implementation-plan.md`: Step 0-5/0-6 갱신

---

## v0.1.0 — 초기 구현 (2026-03-14)

### Phase 0: 핵심 인프라
- LLM 라우터 (`core/llm_router.py`): TaskType enum, Claude/OpenAI 분기, SSE 스트리밍
- 프롬프트 엔진 (`core/prompt_engine.py`): YAML 템플릿 + Jinja2 변수 주입
- 임베딩 엔진 (`core/embedding.py`): text-embedding-3-small + pgvector 검색
- SSE 채팅 라우트 (`api/routes/chat.py`): Vercel AI SDK 호환 스트리밍
- 프론트 API 클라이언트 (`lib/api.ts`): REST + SSE stream + 파일 업로드

### Phase 1: 프로필 관리
- 프로필 CRUD (Pydantic 모델 + Supabase Repository + Service)
- 이력서 파일 파싱 (PDF/DOCX → GPT-4o-mini 구조화)
- 경력/프로젝트 동적 폼 (STAR 구조 가이드)

### Phase 2: 자소서 생성
- 기업 분석 (Brave Search + GPT-4o-mini)
- 자소서 생성 파이프라인 (기업분석 → pgvector 매칭 → Claude 스트리밍)
- 4단계 위저드 UI (입력 → 분석 → 매칭 → 생성)

### Phase 3: 첨삭/피드백
- 4축 분석 엔진 (구조/내용/표현/전략, 1~10점)
- 수정 제안 + 수정본 자동 적용

### Phase 4: 면접 코칭
- 예상질문 생성 (Claude Haiku, 5개 카테고리)
- 모의면접 채팅 (일반/압박/PT 모드, SSE 스트리밍)
- AI 종합 평가 (5축 점수, 등급, 답변별 피드백)

### Phase 5: 고도화
- DOCX 내보내기 (`python-docx`)
- 리서치 파일 연동 (`~/Documents/career/research/`)
- 메인 대시보드 (지원 현황, 프로필 완성도)

### 인프라
- DB: Supabase (9 테이블 + pgvector + match_career_entries RPC)
- 프론트: Next.js 15, React 19, shadcn/ui, Tailwind CSS v4
- 백엔드: FastAPI, Pydantic v2, tenacity retry
- 테스트: pytest 21개 통과
