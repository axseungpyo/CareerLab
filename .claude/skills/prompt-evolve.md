---
description: CareerLab 프롬프트 개선 워크플로우를 가이드합니다. 현재 프롬프트 분석, 개선안 제안, before/after diff, 버전 범프를 포함합니다. Use when user says "프롬프트 개선", "improve prompt", "tune the prompt", "prompt evolve", or reports poor generation quality.
---

# /prompt-evolve

특정 YAML 프롬프트를 분석하고, 구체적 개선안을 제안하며, 버전 범프된 최종 YAML을 제시한다.

## Prerequisites

- CareerLab 프로젝트 디렉토리에서 실행

## Steps

### 1. 대상 및 문제 확인

사용자에게 질문:
- 어떤 프롬프트를 개선할지 (resume_gen, company_analysis, interview, feedback, evaluation)
- 무엇이 문제인지 (예: "자소서가 너무 일반적", "JSON 파싱 실패가 잦음", "면접 질문 깊이 부족")

### 2. 현재 프롬프트 분석

YAML 파일을 읽고 분석:
- **구조**: system/user 메시지 분리, 길이
- **few-shot 예시**: 포함 여부 (현재 CareerLab 프롬프트는 모두 미포함)
- **Chain-of-Thought**: 단계별 사고 지시 여부
- **Negative examples**: "이렇게 하지 마세요" 패턴 여부
- **JSON 포맷 강제**: 출력 형식 지시의 명확성
- **한글 품질**: 자연스러운 한국어인지

### 3. 개선안 제안

문제에 따라 2-3개 구체적 개선안을 제시:

**일반적 답변 문제:**
- Few-shot 예시 추가 (좋은 답변 1개, 나쁜 답변 1개)
- "반드시 포함해야 할 요소" 체크리스트 추가
- 정량적 성과 강제: "숫자가 포함된 성과를 1개 이상 포함하세요"

**JSON 파싱 실패:**
- JSON 포맷 지시 강화: "반드시 유효한 JSON만 출력하세요. 설명 텍스트 없이 JSON만."
- 출력 예시를 실제 파싱 가능한 JSON으로 포함
- 필드 설명을 JSON Schema 형태로 명시

**깊이 부족:**
- Chain-of-Thought 추가: "먼저 문항의 의도를 분석하고, 관련 경력을 선택하고, STAR 구조로 조합하세요"
- 평가 루브릭 추가: "7점은 ~, 3점은 ~"

### 4. Diff 표시

각 개선안에 대해 before/after를 보여준다:

```diff
## resume_gen.yaml — 개선안 1: Few-shot 예시 추가

  system: |
    당신은 한국 취업 시장에 정통한 자소서 컨설턴트입니다.
    ...기존 내용...
+
+   ## 좋은 답변 예시
+   Q: 지원동기를 서술하세요 (500자)
+   A: 2023년 AWS 클라우드 마이그레이션 프로젝트를 주도하며,
+   서비스 응답 속도를 40% 개선한 경험이 있습니다. 이 과정에서
+   귀사의 핵심 가치인 '기술 혁신'과 정확히 일치하는 역량을...
+
+   ## 피해야 할 답변 예시
+   A: 저는 열정을 가지고 귀사에 지원합니다. 열심히 노력하겠습니다.
+   (구체적 사례 없음, 진부한 표현 사용, 기업 키워드 미반영)
```

### 5. 버전 범프

```yaml
metadata:
  version: "1.1.0"  # 1.0.0에서 minor bump
  changelog:
    - version: "1.1.0"
      date: "{오늘 날짜}"
      changes:
        - "Few-shot 예시 추가 (좋은/나쁜 답변)"
        - "정량적 성과 포함 강제 지시 추가"
```

### 6. 최종 YAML 제시

완성된 YAML 전문을 표시한다. 사용자 승인 후에만 파일을 수정한다.

```
위 내용으로 {파일명}을 업데이트할까요? (y/n)
업데이트 후 /prompt-test로 품질을 검증할 수 있습니다.
```

## Error Handling

- **파일 미발견**: "해당 프롬프트 파일이 없습니다. 사용 가능: resume_gen, company_analysis, interview, feedback, evaluation"
- **문제 미명시**: "어떤 부분이 문제인지 알려주세요. 예: '자소서가 너무 일반적', 'JSON 파싱 오류가 자주 발생'"
