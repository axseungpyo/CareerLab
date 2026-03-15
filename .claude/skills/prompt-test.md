---
description: CareerLab 프롬프트 템플릿을 합성 데이터로 테스트합니다. Jinja2 렌더링 미리보기, LLM 호출 품질 분석, A/B 비교를 지원합니다. Use when user says "프롬프트 테스트", "prompt test", "test the prompt", "프롬프트 품질 확인", or after modifying a YAML prompt file.
---

# /prompt-test

특정 프롬프트 템플릿을 합성 데이터로 렌더링하고, 선택적으로 LLM을 호출하여 출력 품질을 분석한다.

## Prerequisites

- CareerLab 프로젝트 디렉토리에서 실행
- LLM 호출 테스트 시 백엔드 서버 실행 필요

## Steps

### 1. 템플릿 선택

사용자에게 테스트할 템플릿을 확인:
- `resume_gen` — 자소서 생성
- `company_analysis` — 기업 분석
- `interview:question_gen` — 예상 질문 생성
- `interview:mock_interview` — 모의면접
- `feedback` — 자소서 첨삭
- `evaluation` — 면접 평가

### 2. 합성 데이터 생성

선택된 템플릿에 맞는 테스트 데이터를 Claude Code가 생성한다:

**resume_gen 예시:**
```python
variables = {
    "company_analysis": '{"requirements": ["Python 3년+", "팀 리드 경험"], "talent_profile": {"핵심가치": ["혁신", "협업"]}, "keywords": ["데이터", "AI", "성장"]}',
    "matched_entries": "1. [프로젝트 리드] AWS 마이그레이션 주도, 처리속도 40% 개선 (2023)\n2. [데이터 분석] 고객 이탈 예측 모델 개발, 정확도 92%",
    "question": "지원동기를 서술해 주세요",
    "tone": "전문적",
    "char_limit": 500,
    "emphasis": None,
}
```

**feedback 예시** (의도적 결함 포함):
```python
variables = {
    "question": "지원동기를 서술해 주세요",
    "answer": "저는 열정을 가지고 귀사에 지원합니다. 노력하겠습니다. 4차 산업혁명 시대에 도전정신으로 소통을 잘하는 인재가 되겠습니다.",
    "company_analysis": None,
}
```

### 3. 렌더링 미리보기

YAML 파일을 직접 읽고, Jinja2 변수를 주입한 결과를 표시:
```
### 렌더링 결과

**System**: 당신은 한국 취업 시장에 정통한 자소서 컨설턴트입니다...
**User**: 다음 기업 분석을 참고하여 자소서 문항에 답변하세요...

[총 토큰 추정: ~1,200]
```

### 4. LLM 호출 (선택)

사용자에게 "실제 LLM을 호출하여 결과를 확인할까요? (y/n)" 확인.

호출 시 해당 API 엔드포인트를 사용:
- resume_gen → `POST /api/resume/generate` (SSE)
- feedback → `POST /api/interview/review/analyze`
- 등

### 5. 출력 품질 분석

LLM 응답을 Claude Code가 분석:

**resume_gen 기준**: STAR 구조 여부, 글자수 제한 준수, 진부 표현 사용, 키워드 포함률
**feedback 기준**: JSON 파싱 성공, 4축 점수 존재, 진부 표현 탐지 작동, 수정안 품질
**question_gen 기준**: 5개 카테고리 모두 포함, answer_guide가 경력 기반인지

### 6. A/B 비교 (선택)

사용자가 수정된 YAML 파일 경로를 제공하면, 동일 합성 데이터로 원본/수정본을 모두 테스트하여 비교:
```
### A/B 비교 결과

| 항목 | 원본 (v1.0.0) | 수정본 (v1.1.0) |
|------|--------------|----------------|
| STAR 구조 | 부분 (R 누락) | 완전 |
| 글자수 | 523 (초과) | 487 |
| 키워드 포함 | 2/3 | 3/3 |
| 진부 표현 | 1건 | 0건 |

수정본이 더 우수합니다.
```

## Error Handling

- **YAML 파싱 실패**: "YAML 구문 오류: {에러}. 파일을 확인하세요."
- **LLM 호출 실패**: "LLM 호출에 실패했습니다. 렌더링 결과만 표시합니다."
- **JSON 파싱 실패 (feedback/evaluation)**: "[FAIL] LLM 응답이 유효한 JSON이 아닙니다. 프롬프트의 JSON 포맷 지시를 강화하세요."
