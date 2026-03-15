# CareerLab Custom Skills 플랜 — 자소서/면접/첨삭 특화 스킬 10종

## Context

CareerLab v0.3.0의 3대 핵심 기능(자소서 생성, 면접 코칭, 첨삭 피드백)이 완성된 상태.
Claude Code에서 `/skill-name`으로 호출할 수 있는 Custom Skills를 만들어, **사용자가 CLI에서 직접 자소서/면접/첨삭 워크플로우를 더 강력하게 활용**할 수 있게 한다.

두 카테고리:
- **콘텐츠 스킬 5종** — 실제 자소서/면접/첨삭 작업을 CLI에서 수행
- **개발 스킬 5종** — 프롬프트 품질, API 상태, DB 검증 등 유지보수

## 스킬 목록

### A. 콘텐츠 스킬 (5종)

| # | 스킬명 | 설명 | 핵심 API |
|---|--------|------|----------|
| 1 | `/batch-resume` | 여러 기업 자소서 일괄 생성 | `/analyze-company`, `/generate` (SSE), `/resume/items` |
| 2 | `/mock-drill` | 모의면접 + **답변별 실시간 코칭** | `/mock/start`, `/mock/chat` (SSE), `/evaluate/{id}` |
| 3 | `/resume-compare` | 자소서 버전/기업간 비교 분석 | `/resume/{id}`, `/review/{report_id}` |
| 4 | `/interview-prep` | 면접 준비 종합 가이드 생성 | `/resume/{id}`, `/questions/{id}`, `/mock/{id}` |
| 5 | `/bulk-review` | 전체 자소서 항목 일괄 첨삭 + 우선순위 | `/review/analyze`, `/review/apply/{id}` |

### B. 개발 스킬 (5종)

| # | 스킬명 | 설명 | 대상 파일 |
|---|--------|------|-----------|
| 6 | `/prompt-audit` | YAML 프롬프트 일관성 감사 | `config/prompts/*.yaml` ↔ `modules/**/*.py` |
| 7 | `/prompt-test` | 합성 데이터로 프롬프트 품질 테스트 | `config/prompts/*.yaml`, API 엔드포인트 |
| 8 | `/api-healthcheck` | 전체 API 엔드포인트 연기 테스트 | `api/routes/*.py` 전체 |
| 9 | `/prompt-evolve` | 프롬프트 개선 가이드 워크플로우 | `config/prompts/*.yaml` |
| 10 | `/db-inspect` | DB 데이터 조회/진단 (임베딩 상태 등) | API GET 엔드포인트 전체 |

---

## 구현 상세

### Skill 1: `/batch-resume` — 일괄 자소서 생성

**파일**: `.claude/skills/batch-resume.md`

**플로우**:
1. `GET /api/profile` → profile_id 확인
2. 사용자에게 기업 목록 (기업명 + 채용공고) 입력받기
3. 기업별 반복:
   - `POST /api/resume/analyze-company` → company_analysis_id
   - `POST /api/resume` → resume_id 생성
   - 분석에서 추출된 질문별 `POST /api/resume/generate` (SSE 소비) → 전문 수집
   - `POST /api/resume/items` → 저장
4. 요약 테이블 출력 (기업, 문항수, 평균 글자수, resume_id)

---

### Skill 2: `/mock-drill` — 답변별 실시간 코칭 모의면접

**파일**: `.claude/skills/mock-drill.md`

**핵심 차별점**: 웹 UI는 종료 후에만 평가하지만, 이 스킬은 **매 답변 후 즉시 피드백** 제공.

**플로우**:
1. `GET /api/resume` → 자소서 선택
2. 모드 선택 (normal/pressure/pt)
3. `POST /api/interview/mock/start` → session_id
4. 인터뷰 루프:
   - 사용자 답변 입력
   - `POST /api/interview/mock/chat` (SSE) → 면접관 응답 표시
   - **Claude Code가 직접 답변 분석**: 점수(1-10), 강점 1개, 개선점 1개, 모범답안 힌트
   - "계속? (y/quit)" 확인
5. `POST /api/interview/mock/end` → `POST /api/interview/evaluate/{id}`
6. 최종 평가 + 스터디 노트(질문/답변/모범답안/개선팁) 마크다운 생성

---

### Skill 3: `/resume-compare` — 자소서 비교 분석

**파일**: `.claude/skills/resume-compare.md`

**지원 모드**:
- 두 자소서 비교 (기업간)
- 동일 항목의 첨삭 전/후 비교
- 버전별 비교

**분석 항목**: 글자수, STAR 구조 충실도, 키워드 적중률, 톤 비교, 고유 표현, 강점/약점 요약

**출력**: 항목별 비교 테이블 + 어느 버전이 더 강한지 추천

---

### Skill 4: `/interview-prep` — 면접 준비 종합 가이드

**파일**: `.claude/skills/interview-prep.md`

**수집 데이터**: 기업 분석, 자소서 핵심 포인트, 예상 질문+모범답안, 과거 모의면접 분석, 첨삭 리포트

**출력 구조**:
1. 기업 분석 요약 (인재상, 키워드, 요구사항)
2. 내 자소서 핵심 포인트 (문항별 STAR 요약)
3. 예상 질문 & 모범 답변 (5개 카테고리)
4. 과거 모의면접 분석 (점수, 공통 약점)
5. 전략적 조언 (초반/압박/마지막 질문)
6. 1분 자기소개 스크립트

---

### Skill 5: `/bulk-review` — 일괄 첨삭 분석

**파일**: `.claude/skills/bulk-review.md`

**플로우**:
1. 자소서 선택 (단일 or 전체)
2. 모든 항목에 `POST /api/interview/review/analyze` 호출
3. 집계: 4축 점수 테이블, 최약 항목 하이라이트, 공통 패턴 (진부 표현 빈도 등)
4. 우선순위 개선 목록 제시
5. 선택적 자동 적용 (`POST /api/interview/review/apply/{id}`)

---

### Skill 6: `/prompt-audit` — 프롬프트 감사

**파일**: `.claude/skills/prompt-audit.md`

**점검 항목**:
1. `metadata.version` + `changelog` 존재
2. Jinja2 변수 (`{{ var }}`) ↔ Python `render()` 호출부 교차 검증
3. JSON 출력 포맷 유효성
4. 한글 스타일 일관성
5. 프롬프트 길이 적정성

**교차 검증 대상**:
- `resume_gen.yaml` ↔ `modules/resume/generator.py`
- `company_analysis.yaml` ↔ `modules/resume/analyzer.py`
- `interview.yaml:question_gen` ↔ `modules/interview/question_gen.py`
- `interview.yaml:mock_interview` ↔ `modules/interview/mock.py`
- `feedback.yaml` ↔ `modules/resume/feedback.py`
- `evaluation.yaml` ↔ `modules/interview/evaluator.py` (인라인 프롬프트 중복 이슈 탐지)

**출력**: PASS/WARN/FAIL 리포트

---

### Skill 7: `/prompt-test` — 합성 데이터 프롬프트 테스트

**파일**: `.claude/skills/prompt-test.md`

**플로우**:
1. 템플릿 선택
2. 합성 입력 데이터 자동 생성 (의도적 결함 포함)
3. Jinja2 렌더링 결과 미리보기
4. (옵션) LLM 호출 → 출력 품질 분석
5. A/B 비교 지원 (원본 vs 수정본)

---

### Skill 8: `/api-healthcheck` — API 전체 연기 테스트

**파일**: `.claude/skills/api-healthcheck.md`

**테스트 범위**:
- 서버 기동 확인 (`/api/health`)
- 서비스 연결 상태 (`/api/settings/status`)
- 각 라우트 그룹 GET 엔드포인트 (profile, resume, interview, settings)
- SSE 스트리밍 검증 (Vercel AI Data Stream 프로토콜)
- 에러 핸들링 (404, 422)

**출력**: 엔드포인트별 상태/응답시간 테이블 + 요약

---

### Skill 9: `/prompt-evolve` — 프롬프트 개선 워크플로우

**파일**: `.claude/skills/prompt-evolve.md`

**플로우**:
1. 템플릿 + 문제점 입력
2. 현재 프롬프트 분석 (구조, few-shot 유무, CoT 유무)
3. 2-3개 개선안 제안 (few-shot 예시, negative examples, JSON 강화 등)
4. Before/After diff 표시 + 버전 범프
5. (옵션) `/prompt-test` 연동으로 개선 효과 검증
6. 최종 YAML 미리보기 (사용자 승인 후 적용)

---

### Skill 10: `/db-inspect` — DB 데이터 조회/진단

**파일**: `.claude/skills/db-inspect.md`

**기능**:
- 테이블별 데이터 조회 (profiles, career_entries, resumes, company_analyses 등)
- 임베딩 상태 확인 (career_entries.embedding 존재 여부)
- 시맨틱 검색 진단 ("왜 매칭이 안 되지?")
- 데이터 통계 요약 (테이블별 row count)

---

## 파일 생성 순서 (우선순위)

```
Tier 1 (즉시):
  .claude/skills/batch-resume.md      — 가장 임팩트 큰 콘텐츠 스킬
  .claude/skills/mock-drill.md        — 핵심 면접 기능 강화
  .claude/skills/bulk-review.md       — batch-resume와 시너지

Tier 2 (중기):
  .claude/skills/interview-prep.md    — 면접 준비 종합 패키지
  .claude/skills/resume-compare.md    — 버전 비교 갭 해소
  .claude/skills/prompt-audit.md      — 프롬프트 품질 관리

Tier 3 (장기):
  .claude/skills/api-healthcheck.md   — 개발 편의
  .claude/skills/prompt-test.md       — prompt-audit 페어
  .claude/skills/prompt-evolve.md     — 프롬프트 개선 루프
  .claude/skills/db-inspect.md        — 디버깅 편의
```

## 스킬 파일 포맷

```markdown
---
description: 한 줄 설명
---

# /skill-name

[Claude Code가 스킬 호출 시 따라야 할 상세 지시]

## Prerequisites
[사전 조건]

## Steps
[번호별 단계]

## API Endpoints Used
[사용하는 API 목록]

## Error Handling
[실패 시 대응]
```

## 기술 참고사항

- **SSE 소비**: `/api/resume/generate`, `/api/interview/mock/chat`는 Vercel AI Data Stream 프로토콜 (`0:` 데이터, `e:` 종료, `d:` 완료)
- **Base URL**: `http://localhost:8000` (인증 불필요)
- **서버 기동 확인**: 모든 스킬은 첫 단계에서 `GET /api/settings/status`로 서버 상태 확인
- **evaluator.py 인라인 프롬프트**: `backend/modules/interview/evaluator.py` 11-44줄에 evaluation 프롬프트가 인라인으로 중복됨. `/prompt-audit`에서 탐지 대상.

## 수정 대상 파일

```
생성:
  .claude/skills/batch-resume.md
  .claude/skills/mock-drill.md
  .claude/skills/bulk-review.md
  .claude/skills/interview-prep.md
  .claude/skills/resume-compare.md
  .claude/skills/prompt-audit.md
  .claude/skills/api-healthcheck.md
  .claude/skills/prompt-test.md
  .claude/skills/prompt-evolve.md
  .claude/skills/db-inspect.md

참조 (읽기 전용):
  backend/api/routes/resume.py
  backend/api/routes/interview.py
  backend/api/routes/settings.py
  backend/config/prompts/*.yaml
  backend/modules/resume/generator.py
  backend/modules/resume/analyzer.py
  backend/modules/resume/feedback.py
  backend/modules/interview/question_gen.py
  backend/modules/interview/mock.py
  backend/modules/interview/evaluator.py
```

## 검증

```bash
# 스킬 파일 존재 확인
ls .claude/skills/*.md | wc -l  # 10개

# 각 스킬 호출 테스트 (Claude Code에서)
# /batch-resume → "기업 목록을 입력해주세요" 응답 확인
# /mock-drill → "자소서를 선택해주세요" 응답 확인
# /prompt-audit → 감사 리포트 생성 확인
# /api-healthcheck → 엔드포인트 테이블 출력 확인
```
