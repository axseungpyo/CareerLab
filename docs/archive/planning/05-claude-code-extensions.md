# 05. Claude Code 확장 기능 활용 가이드

## 확장 포인트 요약

```
기능             역할                    호출 방식          실행 위치
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE.md        프로젝트 컨텍스트       항상 자동 로드     메인 세션
스킬 (Skills)    재사용 워크플로우       자동 매칭 or /skill 메인 세션
서브에이전트     독립 작업 위임          자연어 or /agents  별도 컨텍스트
팀 에이전트      병렬 협업              프롬프트로 구성     각자 컨텍스트
훅 (Hooks)       자동 스크립트          이벤트 트리거       결정론적
MCP 서버         외부 도구 연결          Claude가 자동 호출 메인 세션
플러그인         확장 패키징            설치 후 자동        프로젝트 전체
```

## CLAUDE.md

프로젝트 루트의 핵심 파일. 모든 세션에서 항상 로드됨.
200줄 이내로 유지하고, 상세 워크플로우는 스킬로 분리.

→ 별도 파일: `07-claude-md.md`

## 스킬 (Skills)

`.claude/skills/` 폴더에 마크다운으로 저장.
Claude Code가 대화 맥락에 맞춰 자동 로드.

### CareerLab 스킬 목록

```
.claude/skills/
├── resume-prompt-tuning.md    # 자소서 프롬프트 최적화 규칙
├── supabase-schema.md         # Supabase 테이블/쿼리 규칙
├── component-pattern.md       # shadcn/ui 컴포넌트 작성 패턴
├── api-endpoint.md            # FastAPI 엔드포인트 작성 규칙
├── yaml-prompt.md             # YAML 프롬프트 템플릿 작성법
└── testing.md                 # 테스트 작성 규칙
```

### 프롬프트 버전 관리 규칙

YAML 프롬프트 파일에 `version`과 `changelog` 필드를 포함하여 Git 히스토리와 함께 변경 추적.

```yaml
# config/prompts/resume_gen.yaml 예시
metadata:
  version: "1.0.0"
  description: "기업별 맞춤 자소서 생성 프롬프트"
  changelog:
    - version: "1.0.0"
      date: "2026-03-14"
      change: "초기 버전"

system: |
  당신은 한국 취업 시장 전문 자소서 컨설턴트입니다.
  ...

user: |
  ## 기업 분석
  {{ company_analysis }}

  ## 매칭된 경력
  {{ matched_entries }}
  ...
```

- version은 semver: major(프롬프트 구조 변경), minor(내용 개선), patch(오타/미세 조정)
- 프롬프트 수정 시 반드시 version + changelog 업데이트
- Git diff로 변경 내역 추적 가능
```

### 스킬 예시: supabase-schema.md

```markdown
---
name: supabase-schema
description: Supabase 테이블 생성, 쿼리, RPC 함수 작성 시 적용
---
## Supabase 스키마 규칙
1. 모든 테이블에 uuid PK + created_at + updated_at
2. 외래키는 on delete cascade 기본
3. enum 대신 text + check constraint 사용
4. JSONB는 복잡한 중첩 데이터에만 사용
5. 벡터 컬럼은 vector(1536) + ivfflat 인덱스
6. Python에서는 supabase-py 클라이언트 사용
7. Next.js에서는 @supabase/ssr + supabase-js 사용
```

## 서브에이전트 (Subagents)

별도 컨텍스트 윈도우에서 독립 작업 후 결과만 반환.
메인 컨텍스트를 깨끗하게 유지하는 게 핵심.

### CareerLab 서브에이전트

```
.claude/agents/
├── researcher.md        # 기업/채용 리서치 전담
├── code-reviewer.md     # 코드 품질 검토
├── prompt-tester.md     # 프롬프트 품질 검증
└── schema-designer.md   # Supabase 스키마 설계
```

### 서브에이전트 예시: researcher.md

```markdown
---
name: researcher
description: 기업 분석과 채용 트렌드 리서치
tools: WebSearch, WebFetch, Read, Glob, Grep
model: sonnet
---
한국 취업 시장 전문 리서처.
기업의 채용공고, 인재상, 뉴스, 면접 기출을 조사하고
구조화된 리포트를 작성합니다.

## 출력 형식
- 기업 개요
- 인재상 및 핵심가치
- 직무 요구사항
- 면접 기출 패턴
- 자소서 작성 시 강조 포인트
```

### 사용법

```
> "researcher 에이전트로 삼성전자 DX부문 분석해줘"
> /agents → researcher 선택
```

## 팀 에이전트 (Agent Teams)

서로 메시지를 주고받으며 병렬 협업.
프론트+백엔드 동시 개발에 효과적.

### 사용 예시

```
> "팀을 구성해서 프로필 관리 기능을 만들어줘.
>  팀원 1: FastAPI 백엔드 (Supabase CRUD)
>  팀원 2: Next.js 프론트 (프로필 입력 폼)
>  팀원 3: 프롬프트 설계 (대화형 프로필 입력)
>  리드가 전체 조율, 인터페이스 맞춰줘."
```

### 서브에이전트 vs 팀 에이전트 선택 기준

| 상황 | 선택 |
|------|------|
| 작업이 독립적 (리서치, 코드 리뷰) | 서브에이전트 |
| 작업 간 의존성 있음 (프론트↔백엔드) | 팀 에이전트 |
| 빠른 단발 작업 | 서브에이전트 |
| 복잡한 기능 전체 구현 | 팀 에이전트 |

## 훅 (Hooks)

도구 실행 전후에 자동으로 스크립트 실행.
AI 판단이 아닌 결정론적 제어.

### CareerLab 훅 설정

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [{
          "type": "command",
          "command": "if [[ \"$TOOL_INPUT\" == *frontend* ]]; then cd frontend && npx tsc --noEmit 2>&1 | head -20; fi"
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "[[ \"$TOOL_INPUT\" == *'rm -rf'* ]] && echo '위험한 명령 차단' && exit 2 || exit 0"
        }]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [{
          "type": "command",
          "command": "cd backend && python -m pytest tests/ -q 2>&1 | tail -10"
        }]
      }
    ]
  }
}
```

## 개발 시 vs 앱 런타임 — 핵심 구분

```
┌─ 개발 시 (Claude Code 터미널) ──────────────────┐
│ CLAUDE.md, 스킬, 서브에이전트, 팀에이전트, 훅     │
│ → 코드를 만드는 도구들                            │
│ → Claude Code / Codex CLI 안에서만 동작           │
└──────────────────────────────────────────────────┘

┌─ 앱 런타임 (localhost) ─────────────────────────┐
│ Claude API, OpenAI API, Supabase, Brave Search   │
│ → 앱이 동작할 때 코드가 호출하는 도구들           │
│ → Python/TypeScript 코드로 호출                   │
└──────────────────────────────────────────────────┘
```
