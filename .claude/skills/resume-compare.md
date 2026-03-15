---
description: 자소서 버전 또는 기업간 비교 분석을 수행합니다. 글자수, STAR 구조, 키워드 적중률, 톤, 고유 표현을 비교하고 어느 버전이 더 강한지 추천합니다. Use when user says "자소서 비교", "resume compare", "버전 비교", "전후 비교", "which resume is better", or wants to compare two resume versions or feedback before/after.
---

# /resume-compare

두 자소서(기업간) 또는 동일 항목의 첨삭 전/후를 비교 분석한다.

## Prerequisites

- 백엔드 서버 실행 중 (`http://localhost:8000`)
- 비교할 자소서 또는 첨삭 리포트가 존재해야 함

## Steps

### 1. 비교 모드 확인

```
비교 유형을 선택하세요:

1. 기업간 비교 — 두 자소서의 동일 유형 문항 비교
2. 첨삭 전/후 비교 — 피드백 적용 전후 비교
```

### 2. 데이터 수집

#### 모드 1: 기업간 비교
`GET http://localhost:8000/api/resume` → 목록 표시, 사용자가 2개 선택.
각각 `GET /api/resume/{id}`로 항목 + company_analysis 수집.

#### 모드 2: 첨삭 전/후 비교
`GET http://localhost:8000/api/resume` → 자소서 선택.
`GET /api/resume/{id}` → 항목 목록에서 비교할 항목 선택.
해당 항목의 feedback_report가 있으면 `GET /api/interview/review/{report_id}`로 수집.

### 3. 분석 수행

Claude Code가 직접 두 텍스트를 분석한다:

**분석 항목:**
- **글자수**: 각 텍스트의 문자 수
- **STAR 구조**: 상황(S), 과제(T), 행동(A), 결과(R) 각 요소 존재 여부 (✓/✗)
- **키워드 적중**: 각 기업 분석의 키워드 중 답변에 포함된 비율
- **정량적 성과**: 숫자/퍼센트 등 정량적 표현 개수
- **진부 표현**: "열정을 가지고", "노력하겠습니다" 등 진부 표현 탐지
- **톤**: 전문적/진솔한/열정적/차분한 중 감지된 톤
- **고유 표현**: 한쪽에만 있는 차별화된 표현

### 4. 비교 테이블 출력

```markdown
## 비교 분석: {기업A} vs {기업B}

### 문항: 지원동기

| 항목 | {기업A} | {기업B} |
|------|---------|---------|
| 글자수 | 487 | 512 |
| STAR 구조 | S✓ T✓ A✓ R✗ | S✓ T✓ A✓ R✓ |
| 키워드 적중 | 3/5 (60%) | 4/5 (80%) |
| 정량적 성과 | 1건 | 3건 |
| 진부 표현 | 1건 ("열정을 가지고") | 0건 |
| 감지된 톤 | 전문적 | 진솔한 |

### 차이점 요약
- {기업B}가 STAR 구조의 Result 부분이 있어 더 완성도가 높음
- {기업A}는 "열정을 가지고" 진부 표현 제거 필요
- {기업B}가 정량적 성과를 3건 포함하여 설득력이 높음

### 추천
**{기업B} 자소서가 더 강합니다.** {기업A}에는 정량적 성과 추가와 진부 표현 제거가 필요합니다.
```

### 5. 후속 안내

```
개선하려면:
- /bulk-review → 약한 자소서 일괄 첨삭
- http://localhost:3000/resume/{id} → 웹 UI에서 직접 수정
```

## API Endpoints Used

| Method | Endpoint | 용도 |
|--------|----------|------|
| GET | `/api/resume` | 자소서 목록 |
| GET | `/api/resume/{id}` | 자소서 상세 |
| GET | `/api/interview/review/{report_id}` | 첨삭 리포트 |

## Error Handling

- **자소서 1개뿐**: "비교하려면 최소 2개의 자소서가 필요합니다."
- **첨삭 리포트 없음**: "이 항목에 첨삭 리포트가 없습니다. /bulk-review로 먼저 첨삭을 진행하세요."
