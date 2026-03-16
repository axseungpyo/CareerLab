# Changelog

CareerLab 버전별 변경사항 기록.

---

## v0.7.0 — 프로필 UX 고도화 + Supabase 원격 전환 (2026-03-16)

### 프로필 페이지 리디자인
- **개선** 4탭 구조 전환: 기본정보 / 학력 / 경력 / 가져오기
- **추가** 프로필 완성도 프로그레스 바 (5필드 기준 %)
- **추가** 학력 탭: 학교명 datalist 자동완성 (30개교), 전공 datalist (29개), 학위 Select 드롭다운
- **추가** 학력 탭: 기간 입력 date input (시작~종료)
- **개선** 경력 탭: 인라인 편집 모드 + STAR 접기/펼치기
- **개선** 가져오기 탭: 파일/Notion 파싱 → 미리보기 카드 → "반영" 버튼으로 폼 자동 채우기
- **개선** `ProfileForm`: 제어 컴포넌트 리팩토링 (개별 필드 props), 핵심가치 태그 칩 (Enter 추가/X 삭제)
- **개선** `CareerEntryForm`: 편집 모드 `editEntry` prop 추가

### Supabase 원격 전환
- **변경** DB 연결: 로컬 Docker (`localhost:54321`) → 원격 Supabase (`mgnhqxqqcaoisnejmjmh.supabase.co`)
- **추가** Supabase MCP로 원격 DB 스키마 생성 (10 테이블 + 트리거 + 인덱스 + RPC)
- **추가** `applications` 테이블 (15 컬럼, stage/result CHECK 제약조건)
- **추가** pgvector 확장 + `match_career_entries` RPC 함수
- **정리** 로컬 Docker Supabase 컨테이너 중지, 더미 데이터 초기화

---

## v0.6.0 — 취업 관리 시스템 (2026-03-16)

### 백엔드
- **추가** `modules/application/`: models, repository, service, url_parser
- **추가** `api/routes/application.py`: CRUD + PATCH stage + POST parse-url + GET calendar (10개 엔드포인트)
- **추가** URL 자동 파싱: Tavily 크롤링 + GPT 추출 (직접 fetch 폴백)

### 프론트엔드
- **추가** `/applications`: 칸반 보드 (4단계: 관심 → 지원 → 면접 → 결과)
- **추가** `/applications/new`: 등록 페이지 (URL 자동 파싱 + 수동 입력)
- **추가** `/applications/[id]`: 상세 페이지 (단계 변경 + 메모)
- **추가** `/applications/calendar`: 월간 캘린더 뷰 (CSS Grid, 마감일/면접일 표시)
- **추가** 네비게이션: "지원관리" 메뉴 (Briefcase 아이콘)

---

## v0.5.0 — 데이터 커넥터 (2026-03-16)

### Step 1-2: DataConnector + FileConnector + NotionConnector + API
- **추가** `DataConnector` 추상 클래스: `extract_text()` → `parse()` 파이프라인
- **추가** `FileConnector`: PDF/DOCX/TXT/MD 지원 (한글 인코딩 자동 감지)
- **추가** `NotionConnector`: Notion API 페이지 검색 + 블록 텍스트 추출 (페이지네이션)
- **추가** `NotionSettings` 모델 (enabled + api_key)
- **수정** `POST /api/profile/upload`: 허용 확장자 pdf,docx → pdf,docx,txt,md
- **추가** `GET /api/profile/import/notion/pages?query=`: Notion 페이지 검색
- **추가** `POST /api/profile/import/notion`: Notion 페이지 → GPT 구조화 → 프로필+경력
- **추가** Settings UI: Notion 카드 (토글 + API Key + Integration 가이드 링크)

---

## v0.4.0 — 사용자 경험 강화 (2026-03-16)

### Phase 1: 대시보드 강화
- **추가** `backend/api/routes/stats.py`: `GET /api/stats/summary` (자소서/합격률/면접/첨삭 통계)
- **추가** `GET /api/stats/trends`: 면접 점수 추이, 첨삭 4축 추이, 월별 자소서 수
- **개선** 홈 대시보드: StatCard 4종 (자소서/합격률/모의면접/첨삭평균)
- **개선** 면접 점수 추이 LineChart + 첨삭 4축 BarChart (recharts)
- **개선** 첨삭 4축 평균 게이지 바

### Phase 2: 자소서 품질 개선 루프
- **추가** `GET /api/resume/{id}/items/versions?question=`: 동일 질문 버전 목록 API
- **추가** `POST /api/interview/review/apply-selective/{report_id}`: 선택적 수정안 적용 API
- **추가** `GET /api/interview/review/reports/{resume_item_id}`: 항목별 첨삭 리포트 목록
- **개선** 자소서 상세 페이지: 버전 이력 패널 (버전 목록 + 복원 기능)
- **개선** 첨삭 페이지: 원문/수정본 사이드바이사이드 비교 뷰 (diff toggle)
- **개선** 첨삭 페이지: 제안별 체크박스 선택 + "선택 적용" 버튼

### Phase 3: 면접 훈련 강화
- **개선** 면접 결과 페이지: 답변별 접기/펼치기 카드 (점수 배지 + 색상 코딩 + 약점 태그)
- **개선** 면접 결과 페이지: 5축 점수 게이지 바, 모범답안 배경색 구분
- **추가** `GET /api/interview/mock/sessions/{resume_id}`: 자소서별 세션 목록 API
- **추가** `/interview/compare`: 세션 비교 페이지 (5축 BarChart + 강점/약점 대조)
- **추가** `/interview/weak-points`: 오답노트 페이지 (6점 이하 답변 수집, 모범답안, "다시 연습" 링크)

### Phase 4: 데이터 활용
- **추가** PDF 내보내기: `GET /api/resume/{id}/export?format=pdf` (WeasyPrint 또는 HTML 폴백)
- **추가** CSV 내보내기: `GET /api/stats/export/resumes`, `GET /api/stats/export/interviews`
- **개선** 내보내기 포맷 선택: `?format=docx` (기본) 또는 `?format=pdf`
- **추가** 리서치 파일 자동 연결: 자소서 생성 시 기업명 매칭 리서치 파일을 프롬프트 컨텍스트에 주입

---

## v0.3.1 — 검색 프로바이더 + 문서/스킬 (2026-03-16)

### 추가
- **웹 검색 멀티 프로바이더**: Brave → Tavily/Perplexity Sonar/Brave 3종 지원
- **SearchSettings 모델**: provider 선택 + 프로바이더별 API key
- **Settings UI**: 웹 검색 카드 (프로바이더 드롭다운 + 키 입력)
- **Custom Skills 10종**: batch-resume, mock-drill, bulk-review, interview-prep, resume-compare, prompt-audit, prompt-test, api-healthcheck, prompt-evolve, db-inspect
- **문서**: automation-plan.md, feature-backlog.md, v0.4.0 Plan 문서

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
