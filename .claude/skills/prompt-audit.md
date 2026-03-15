---
description: CareerLab의 YAML 프롬프트 파일을 감사합니다. 메타데이터 검증, Jinja2 변수 교차 검증, JSON 출력 유효성, 한글 스타일 일관성, 인라인 프롬프트 중복을 점검합니다. Use when user says "프롬프트 감사", "prompt audit", "프롬프트 검증", "check prompts", or before releasing prompt changes.
---

# /prompt-audit

`backend/config/prompts/` 디렉토리의 모든 YAML 프롬프트 파일을 체계적으로 감사한다.

## Prerequisites

- CareerLab 프로젝트 디렉토리에서 실행

## Steps

### 1. 프롬프트 파일 스캔

다음 파일을 읽는다:
- `backend/config/prompts/resume_gen.yaml`
- `backend/config/prompts/company_analysis.yaml`
- `backend/config/prompts/interview.yaml`
- `backend/config/prompts/feedback.yaml`
- `backend/config/prompts/evaluation.yaml`

### 2. 메타데이터 검증

각 파일에서:
- `metadata.version` 존재 여부 (semver 형식: x.y.z)
- `metadata.description` 존재 여부
- `metadata.changelog` 존재 여부 및 최신 항목 확인
- `system`/`user` 키 또는 서브키 구조 확인

### 3. Jinja2 변수 교차 검증 (핵심)

각 프롬프트 파일의 `{{ variable }}` 패턴을 추출하고, 대응하는 Python 파일의 `render()` 호출부와 대조한다:

| YAML 파일 | Python 파일 | render 호출 위치 |
|-----------|------------|-----------------|
| `resume_gen.yaml` | `modules/resume/generator.py` | `self._prompt.render("resume_gen", variables)` |
| `company_analysis.yaml` | `modules/resume/analyzer.py` | `self._prompt.render("company_analysis", variables)` |
| `interview.yaml` (question_gen) | `modules/interview/question_gen.py` | `self._prompt.render("interview", variables, sub_key="question_gen")` |
| `interview.yaml` (mock_interview) | `modules/interview/mock.py` | `self._prompt.render("interview", variables, sub_key="mock_interview")` |
| `feedback.yaml` | `modules/resume/feedback.py` | `self._prompt.render("feedback", variables)` |
| `evaluation.yaml` | `modules/interview/evaluator.py` | **주의: PromptEngine을 사용하지 않을 수 있음** |

탐지:
- **누락 변수**: YAML에서 사용하지만 Python에서 전달하지 않는 변수
- **미사용 변수**: Python에서 전달하지만 YAML에서 사용하지 않는 변수
- **인라인 프롬프트 중복**: `evaluator.py`에서 YAML 대신 인라인 문자열로 프롬프트를 정의하는 경우 → FAIL로 보고

### 4. JSON 출력 포맷 검증

JSON 응답을 기대하는 프롬프트 (company_analysis, feedback, evaluation, interview:question_gen):
- 프롬프트 내 JSON 예시가 유효한 JSON인지 확인
- `json_mode=True`로 LLM을 호출하는지 Python 코드에서 확인
- JSON 구조 설명이 충분히 상세한지 확인

### 5. 내용 품질 점검

- **한글 일관성**: 모든 system 프롬프트가 동일한 경어 수준 (존댓말/반말) 사용
- **프롬프트 길이**: 토큰 수 추정 (한글 2자/토큰 기준) → 컨텍스트 윈도우 대비 적정성
- **진부 표현 목록**: `feedback.yaml`의 진부 표현 리스트가 다른 프롬프트와 일관되는지

### 6. 리포트 출력

```
## 프롬프트 감사 리포트

### resume_gen.yaml (v1.0.0)
- [PASS] 메타데이터 완전
- [PASS] 변수 일치: company_analysis, matched_entries, question, tone, char_limit, emphasis
- [PASS] JSON 출력 미요구 (텍스트 생성 — 정상)

### company_analysis.yaml (v1.0.0)
- [PASS] 메타데이터 완전
- [PASS] 변수 일치: job_posting_text, company_info
- [PASS] JSON 출력 포맷 유효

### interview.yaml (v1.0.0)
- [PASS] question_gen 변수 일치
- [WARN] mock_interview의 mode_instruction이 YAML 내부 맵에서 관리됨 — 변수 주입 방식 확인 필요

### feedback.yaml (v1.0.0)
- [PASS] 메타데이터 완전
- [PASS] 변수 일치
- [PASS] 진부 표현 목록 포함 (5개)

### evaluation.yaml (v1.0.0)
- [FAIL] evaluator.py에서 PromptEngine 미사용 — 인라인 프롬프트 중복
         evaluator.py 라인 11-44에 프롬프트가 하드코딩됨.
         evaluation.yaml과 동기화되지 않을 위험.
         권장: PromptEngine.render("evaluation", ...) 사용으로 리팩토링

### 교차 이슈
- [INFO] 전체 프롬프트 한글 경어 수준: 존댓말 통일 ✓
- [INFO] 전체 추정 토큰: ~2,800 토큰 (적정)
```

## Error Handling

- **파일 미발견**: "[SKIP] {파일명} — 파일이 존재하지 않습니다"
- **YAML 파싱 실패**: "[FAIL] {파일명} — YAML 파싱 오류: {에러 메시지}"
