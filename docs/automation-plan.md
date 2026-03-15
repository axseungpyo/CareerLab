# CareerLab — Claude Code 자동화 계획서

> CareerLab 개발 생산성을 높이기 위한 Hooks, Custom Skills, Agent 활용 계획.

---

## 0. Claude CLI vs Codex CLI — 모델별 역할 분담

CareerLab은 **두 개의 CLI 인증 경로**를 통해 최신 모델을 태스크별로 자동 라우팅합니다.

### Claude CLI (Anthropic 구독 인증)

| 모델 | 모델 ID | 역할 | 태스크 |
|------|---------|------|--------|
| **Claude Opus 4.6** | `claude-opus-4-6` | 고난도 추론/생성 | 복합 자소서 생성 (다수 경력 종합), 심층 첨삭 분석, 전략적 면접 코칭 |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | 주력 생성 모델 | 자소서 생성 (SSE 스트리밍), 모의면접 대화, 첨삭 피드백, 면접 평가 |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | 경량 빠른 응답 | 예상 질문 생성 (5개 카테고리), 간단 분류/요약 |

**라우팅 로직 (`core/llm_router.py`):**
```python
TASK_MODEL_MAP = {
    TaskType.RESUME_GEN:      "claude-sonnet-4-6",     # 자소서 생성
    TaskType.RESUME_REVIEW:   "claude-sonnet-4-6",     # 첨삭 분석
    TaskType.MOCK_INTERVIEW:  "claude-sonnet-4-6",     # 모의면접 대화
    TaskType.EVALUATION:      "claude-sonnet-4-6",     # 면접 평가
    TaskType.QUESTION_GEN:    "claude-haiku-4-5-20251001",  # 예상질문 생성
    # Opus 4.6은 복합 추론이 필요한 프리미엄 태스크에 선택적 사용
}
```

**인증 모드:**
| 모드 | 방식 | 설정 |
|------|------|------|
| `cli` (기본) | `claude -p` 로컬 CLI → 구독 인증 자동 | `core/claude_cli.py` |
| `api_key` | `x-api-key` 헤더로 직접 호출 | Settings UI에서 입력 |

---

### Codex CLI (OpenAI/ChatGPT 인증)

| 모델 | 모델 ID | 역할 | 태스크 |
|------|---------|------|--------|
| **GPT-5.4** | `gpt-5.4` | 최신 플래그십 | 복합 채용공고 심층 분석, 멀티소스 기업 리서치 종합, 고난도 이력서 파싱 |
| **GPT-5.2** | `gpt-5.2` | 고성능 분석 | 채용공고 분석, 이력서 파싱 (PDF/DOCX → JSON), 기업 정보 종합 |
| **GPT-5 mini** | `gpt-5-mini` | 경량 분석 (주력) | 기업 정보 요약, 간단한 텍스트 추출, 분류, 일반 파싱 |
| **GPT-5 nano** | `gpt-5-nano` | 초경량/최저비용 | 태그 생성, 키워드 추출, 단순 분류 |
| **text-embedding-3-small** | `text-embedding-3-small` | 벡터 임베딩 | 경력 항목 임베딩, 시맨틱 검색 (pgvector, 1536차원) |

> **참고:** GPT-5.4는 1,050K 컨텍스트 윈도우 + 128K 출력 지원. 에이전틱/코딩/전문 워크플로우에 최적화.
> GPT-5.2-Codex (`gpt-5.2-codex`)는 에이전틱 코딩에 특화되어 개발 도구(Codex CLI) 자체에서 활용.
> 임베딩 모델은 `text-embedding-3-small`이 여전히 최신이며, 비용 대비 성능이 우수.

**라우팅 로직:**
```python
TASK_MODEL_MAP = {
    TaskType.COMPANY_ANALYSIS: "gpt-5-mini",            # 기업 분석 (일반)
    TaskType.FILE_PARSING:     "gpt-5-mini",            # 이력서 파싱
    TaskType.DEEP_RESEARCH:    "gpt-5.4",               # 심층 리서치 (필요 시)
    TaskType.EMBEDDING:        "text-embedding-3-small", # 벡터 임베딩
}
```

**인증 모드:**
| 모드 | 방식 | 설정 |
|------|------|------|
| `codex_cli` (기본) | `~/.codex/auth.json` ChatGPT OAuth 토큰 추출 | `core/codex_cli.py` |
| `oauth` | `~/.openai/.credentials.json` 토큰 로드 | `core/oauth_loader.py` |
| `api_key` | OpenAI API Key 직접 입력 | Settings UI에서 입력 |

---

### 역할 분담 원칙

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 요청                            │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
       창작/생성 태스크               분석/파싱 태스크
              │                           │
    ┌─────────▼─────────┐       ┌─────────▼─────────┐
    │   Claude (Anthropic)│       │   GPT (OpenAI)     │
    │                     │       │                     │
    │ Opus 4.6   복합추론 │       │ GPT-5.4    플래그십 │
    │ Sonnet 4.6 주력생성 │       │ GPT-5.2    정밀분석 │
    │ Haiku 4.5  경량생성 │       │ 5-mini     경량분석 │
    │                     │       │ 5-nano     초경량   │
    │                     │       │ emb-3-small 임베딩  │
    └─────────────────────┘       └─────────────────────┘
```

**분담 기준:**
- **Claude 계열** → 한국어 자연어 생성 품질이 핵심인 태스크 (자소서, 면접, 첨삭)
- **GPT 계열** → 구조화된 데이터 추출/분석이 핵심인 태스크 (파싱, 분석, 임베딩)
- **비용 최적화** → 태스크 복잡도에 따라 상위/하위 모델 자동 선택 (Haiku/nano로 가능한 건 하위 모델 사용)

---

## 1. Hooks

### 1.1 Pre-commit: 타입체크 + 린트 + 테스트

**목적:** 커밋 전에 프론트엔드 타입 오류와 백엔드 테스트 실패를 차단.

**트리거:** `PreToolUse` — Bash 도구에서 `git commit` 실행 시

**설정 (`/.claude/settings.json`):**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$TOOL_INPUT\" | grep -q 'git commit'; then cd frontend && npx tsc --noEmit 2>&1 | tail -5 && cd ../backend && python -m pytest tests/ -q 2>&1 | tail -5; fi"
          }
        ]
      }
    ]
  }
}
```

**기대 효과:**
- 타입 오류가 있는 코드가 커밋되는 것을 방지
- 테스트 실패를 커밋 전에 발견
- CI 피드백 대기 시간 제거 (로컬에서 즉시 확인)

---

### 1.2 Post-file-save: 프롬프트 버전 체크

**목적:** YAML 프롬프트 파일 수정 시 `metadata.version` 업데이트 여부를 확인.

**트리거:** `PostToolUse` — Edit/Write 도구로 `config/prompts/*.yaml` 파일 수정 시

**설정:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$TOOL_INPUT\" | grep -q 'config/prompts/'; then echo '⚠️ 프롬프트 파일 수정됨 — metadata.version 업데이트 필요'; fi"
          }
        ]
      }
    ]
  }
}
```

**기대 효과:**
- 프롬프트 변경 시 버전 누락 방지
- `CLAUDE.md`의 "프롬프트 수정 시 반드시 version 업데이트" 규칙 자동 적용

---

### 1.3 Pre-commit: 시크릿 유출 방지

**목적:** `.env`, API Key 등 민감 정보가 커밋에 포함되지 않도록 차단.

**트리거:** `PreToolUse` — `git commit` 또는 `git add` 실행 시

**설정:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$TOOL_INPUT\" | grep -qE 'git (add|commit)'; then git diff --cached --name-only 2>/dev/null | grep -qE '\\.(env|credentials|secret)' && echo 'BLOCK: 민감 파일이 스테이징됨' && exit 1 || true; fi"
          }
        ]
      }
    ]
  }
}
```

---

## 2. Custom Skills

### 2.1 `/careerlab-test` — 백엔드 테스트 실행

**목적:** 백엔드 테스트를 빠르게 실행하고 결과를 분석.

**스킬 파일 (`.claude/skills/careerlab-test.md`):**
```markdown
---
name: careerlab-test
description: CareerLab 백엔드 테스트 실행 및 결과 분석
---

## Steps

1. `cd backend && python -m pytest tests/ -v --tb=short` 실행
2. 실패한 테스트가 있으면:
   - 관련 소스 파일 읽기
   - 실패 원인 분석 및 수정 제안
3. 전체 통과 시 커버리지 요약 출력:
   `python -m pytest tests/ --cov=. --cov-report=term-missing`
```

**사용 예시:** `/careerlab-test` → 전체 테스트 실행 + 실패 분석

---

### 2.2 `/careerlab-e2e` — Playwright E2E 테스트

**목적:** 주요 사용자 플로우를 Playwright로 자동 검증.

**스킬 파일 (`.claude/skills/careerlab-e2e.md`):**
```markdown
---
name: careerlab-e2e
description: Playwright로 CareerLab 핵심 플로우 E2E 테스트
---

## 테스트 시나리오

### 시나리오 1: 프로필 생성
1. localhost:3000/profile 접속
2. 이름, 이메일, 경력 목표 입력
3. 경력 항목 추가 (STAR 구조)
4. 저장 후 홈 화면에서 프로필 진행률 확인

### 시나리오 2: 자소서 생성
1. localhost:3000/resume/new 접속
2. 기업명 + 채용공고 입력
3. "분석" 버튼 → 기업 분석 완료 대기
4. 질문 입력 → "생성" 버튼 → 스트리밍 응답 확인
5. 저장 후 자소서 상세 페이지 확인

### 시나리오 3: 모의면접
1. 면접 페이지에서 자소서 선택 → 질문 생성
2. 모의면접 시작 (normal 모드)
3. 3턴 대화 후 종료
4. 평가 결과 (점수, 등급, 피드백) 확인

## 실행 방법
Playwright MCP 서버를 사용하여 각 시나리오를 순차 실행.
스크린샷을 캡처하여 시각적 검증.
```

---

### 2.3 `/careerlab-prompt-audit` — 프롬프트 감사

**목적:** 프롬프트 YAML 파일의 품질과 일관성을 점검.

**스킬 파일 (`.claude/skills/careerlab-prompt-audit.md`):**
```markdown
---
name: careerlab-prompt-audit
description: 프롬프트 YAML 파일 품질 감사 (버전, 변수, 구조)
---

## 점검 항목

1. **버전 관리**: 모든 YAML에 `metadata.version` + `changelog` 존재 확인
2. **변수 일관성**: Jinja2 변수(`{{ var }}`)가 실제 코드에서 주입되는지 확인
   - `prompt_engine.py`의 `render()` 호출부와 대조
   - 미사용 변수, 누락 변수 탐지
3. **프롬프트 길이**: 토큰 수 추정 (4자/토큰 기준) → 컨텍스트 윈도우 내 확인
4. **구조 일관성**: system/user 키 패턴 통일 여부
5. **한글 품질**: 어색한 표현, 오탈자 체크

## 출력
각 YAML 파일별 감사 결과를 테이블로 정리.
```

---

### 2.4 `/careerlab-db` — DB 스키마 검증

**목적:** Supabase 마이그레이션과 코드의 DB 접근이 동기화되어 있는지 확인.

**스킬 파일 (`.claude/skills/careerlab-db.md`):**
```markdown
---
name: careerlab-db
description: DB 스키마와 코드의 동기화 검증
---

## Steps

1. `supabase/migrations/*.sql`에서 테이블 정의 추출
2. `backend/modules/*/repository.py`에서 사용하는 컬럼명 추출
3. 불일치 탐지:
   - 코드에서 참조하지만 스키마에 없는 컬럼
   - 스키마에 있지만 코드에서 미사용인 컬럼
4. Pydantic 모델(`models.py`)과 DB 컬럼 타입 호환성 확인
5. RPC 함수(`match_career_entries`) 시그니처와 호출부 대조
```

---

### 2.5 `/careerlab-build` — 풀 빌드 검증

**목적:** 프론트엔드 빌드 + 백엔드 기동을 한 번에 확인.

**스킬 파일 (`.claude/skills/careerlab-build.md`):**
```markdown
---
name: careerlab-build
description: 프론트엔드 빌드 + 백엔드 기동 검증
---

## Steps

1. 프론트엔드 빌드: `cd frontend && pnpm build`
   - 빌드 에러 시 원인 분석 및 수정
2. 백엔드 임포트 체크: `cd backend && python -c "from main import app; print('OK')"`
   - 임포트 에러 시 의존성 확인
3. 타입 체크: `cd frontend && npx tsc --noEmit`
4. 결과 요약 출력
```

---

### 2.6 `/careerlab-release` — 릴리스 체크리스트

**목적:** 버전 릴리스 전 필수 점검 항목을 자동 실행.

**스킬 파일 (`.claude/skills/careerlab-release.md`):**
```markdown
---
name: careerlab-release
description: 릴리스 전 체크리스트 자동 실행
---

## Checklist

1. [ ] 모든 테스트 통과: `cd backend && python -m pytest tests/ -q`
2. [ ] 타입 체크 통과: `cd frontend && npx tsc --noEmit`
3. [ ] 프론트엔드 빌드 성공: `cd frontend && pnpm build`
4. [ ] 프롬프트 버전 확인: 모든 YAML에 최신 `metadata.version`
5. [ ] 환경변수 문서화: `.env.example` 최신 상태
6. [ ] DB 마이그레이션 동기화: `supabase db push` 정상
7. [ ] CHANGELOG 업데이트
8. [ ] Git tag 생성: `git tag -a v{version} -m "Release v{version}"`

각 항목을 순차 실행하고, 실패 시 해당 단계에서 중단 + 원인 분석.
```

---

## 3. Agent 활용

### 3.1 Playwright E2E Agent

**용도:** `/careerlab-e2e` 스킬과 연계하여 브라우저 기반 통합 테스트 수행.

**활용 방법:**
- `mcp__playwright__playwright_navigate` → 각 페이지 접속
- `mcp__playwright__playwright_fill` → 폼 입력
- `mcp__playwright__playwright_click` → 버튼 클릭
- `mcp__playwright__playwright_screenshot` → 결과 스크린샷
- `mcp__playwright__playwright_get_visible_text` → 텍스트 검증

**주요 검증 포인트:**
| 페이지 | 검증 항목 |
|--------|----------|
| `/profile` | 프로필 저장 후 DB 반영, 경력 항목 CRUD |
| `/resume/new` | 기업 분석 → 자소서 생성 스트리밍 → 저장 |
| `/interview/mock` | 모의면접 대화 → 평가 결과 표시 |
| `/review` | 첨삭 분석 → 4축 점수 → 수정안 적용 |
| `/settings` | 서비스 연결 상태 표시, 인증 모드 변경 |

---

### 3.2 Code Review Agent (`superpowers:code-reviewer`)

**용도:** 주요 기능 구현 완료 후 코드 품질 검증.

**트리거 시점:**
- 새 모듈 추가 후 (예: 새 API 라우트)
- 리팩토링 완료 후
- PR 생성 전

**검증 기준:**
- CLAUDE.md 코딩 규칙 준수 (TypeScript strict, Python 타입힌트, async def)
- 보안 취약점 (SQL injection, XSS)
- 에러 핸들링 패턴 일관성
- 서비스/리포지토리 패턴 준수

---

### 3.3 Gap Detector (`bkit:gap-detector`)

**용도:** 설계 문서와 실제 구현의 차이를 탐지.

**활용 시나리오:**
- CLAUDE.md의 Architecture 섹션과 실제 코드 구조 비교
- 프롬프트 YAML의 변수와 코드의 주입 변수 대조
- DB 스키마와 Pydantic 모델 필드 매핑 검증

---

### 3.4 Code Analyzer (`bkit:code-analyzer`)

**용도:** 코드 품질, 보안, 성능 이슈를 자동 탐지.

**주요 분석 대상:**
- `core/llm_router.py` — API Key 노출, 에러 핸들링
- `modules/*/repository.py` — SQL injection 가능성, 트랜잭션 누락
- `frontend/lib/api.ts` — XSS, CSRF 방어
- `app/settings/page.tsx` — API Key 마스킹 적정성

---

## 4. 우선순위 로드맵

### Tier 1 — 즉시 적용 (1일)

| 항목 | 유형 | 효과 |
|------|------|------|
| Pre-commit 타입체크+테스트 Hook | Hook | 타입 오류/테스트 실패 커밋 차단 |
| `/careerlab-test` 스킬 | Skill | 테스트 실행 자동화 |
| `/careerlab-build` 스킬 | Skill | 빌드 검증 원커맨드화 |
| 시크릿 유출 방지 Hook | Hook | 민감 정보 커밋 차단 |

### Tier 2 — 중기 적용 (1주)

| 항목 | 유형 | 효과 |
|------|------|------|
| `/careerlab-prompt-audit` 스킬 | Skill | 프롬프트 품질 일관성 유지 |
| `/careerlab-db` 스킬 | Skill | 스키마-코드 동기화 자동 검증 |
| 프롬프트 버전 체크 Hook | Hook | 프롬프트 변경 시 버전 누락 방지 |
| Playwright E2E Agent 활용 | Agent | 핵심 플로우 자동 검증 |

### Tier 3 — 장기 적용 (1개월)

| 항목 | 유형 | 효과 |
|------|------|------|
| `/careerlab-e2e` 스킬 | Skill | E2E 시나리오 표준화 |
| `/careerlab-release` 스킬 | Skill | 릴리스 프로세스 자동화 |
| Code Review Agent 루틴 | Agent | PR마다 자동 코드 리뷰 |
| Gap Detector 정기 실행 | Agent | 설계-구현 드리프트 감지 |

---

## 5. 설정 파일 구조

```
.claude/
  settings.json          # Hooks 설정
  skills/
    careerlab-test.md
    careerlab-e2e.md
    careerlab-prompt-audit.md
    careerlab-db.md
    careerlab-build.md
    careerlab-release.md
```

> 모든 스킬은 `/스킬명`으로 대화 중 즉시 호출 가능.
> Hook은 Claude Code 세션에서 자동 실행되며, 별도 호출 불필요.
