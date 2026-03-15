---
description: 면접 준비 종합 가이드를 생성합니다. 기업 분석, 자소서 핵심 포인트, 예상 질문과 모범 답변, 과거 모의면접 분석, 전략적 조언, 1분 자기소개 스크립트를 하나의 마크다운 문서로 종합합니다. Use when user says "면접 준비", "interview prep", "면접 가이드", "스터디 가이드", or mentions preparing for a specific company interview.
---

# /interview-prep

자소서 기반으로 특정 기업 면접 준비에 필요한 모든 정보를 수집하여 종합 가이드를 생성한다.

## Prerequisites

- 백엔드 서버 실행 중 (`http://localhost:8000`)
- 대상 기업의 자소서가 저장되어 있어야 함

## Steps

### 1. 서버 및 자소서 확인

`GET http://localhost:8000/api/settings/status` → 서비스 상태 확인.
`GET http://localhost:8000/api/resume` → 자소서 목록 표시, 사용자에게 선택 요청.
선택된 `resume_id`로 `GET http://localhost:8000/api/resume/{id}` 호출하여 항목 + company_analysis 수집.

### 2. 데이터 수집

순차적으로 수집:
- **기업 분석**: resume 응답의 company_analysis에서 requirements, talent_profile, keywords, research_notes 추출
- **예상 질문**: `GET http://localhost:8000/api/interview/questions/{resume_id}`. 없으면 `POST /api/interview/generate-questions` 호출하여 생성
- **과거 모의면접**: resume에 연결된 mock_sessions가 있으면 `GET /api/interview/mock/{session_id}`로 평가 데이터 수집

### 3. 가이드 생성

수집된 데이터를 기반으로 Claude Code가 직접 종합 가이드를 마크다운으로 작성한다:

```markdown
# 면접 준비 가이드: {기업명}
생성일: {날짜}

## 1. 기업 분석 요약
- **인재상**: {talent_profile 요약}
- **핵심 키워드**: {keywords 나열}
- **주요 요구사항**: {requirements 요약}
- **리서치 노트**: {research_notes}

## 2. 내 자소서 핵심 포인트
{각 resume_item에 대해}
### Q: {question}
- **핵심 주장**: {답변의 핵심 메시지 1-2줄 요약}
- **STAR 요약**: 상황 → 과제 → 행동 → 결과
- **사용된 키워드**: {기업 키워드 중 포함된 것들}

## 3. 예상 질문 & 모범 답변
{카테고리별로 그룹}
### 자소서 기반
- **Q**: {question} ({difficulty})
  **답변 가이드**: {answer_guide}
  **모범 답변**: {Claude Code가 경력 데이터 기반으로 생성}

### 직무 역량 / 기업 적합 / 인성 / 압박
{같은 패턴으로 반복}

## 4. 과거 모의면접 분석
{과거 세션이 있으면}
- 최근 세션: {날짜}, {모드}, 종합 점수 {score}/100 ({grade})
- 강점: {strengths}
- 약점: {weaknesses}
- 개선 추이: {여러 세션 비교 시}

## 5. 전략적 조언
- **면접 초반 (1분 자기소개)**: {아래 6번 참조}
- **중반 (직무 질문)**: STAR 구조로 답변, 정량적 성과 필수
- **압박 질문 대응**: 당황하지 말고 "좋은 질문입니다" 후 구조화된 답변
- **마지막 질문 ("질문 있으신가요?")**: 기업 키워드 기반 역질문 3개 준비

## 6. 1분 자기소개 스크립트
{프로필 + 핵심 경력 + 지원 동기를 종합하여 60초 분량 스크립트 생성}
```

### 4. 출력 및 안내

생성된 가이드를 터미널에 표시한다.

```
다음 단계:
- /mock-drill → 이 자소서로 모의면접 연습
- /bulk-review → 자소서 첨삭으로 답변 보강
- 파일로 저장하려면 알려주세요
```

## API Endpoints Used

| Method | Endpoint | 용도 |
|--------|----------|------|
| GET | `/api/settings/status` | 서비스 상태 |
| GET | `/api/resume` | 자소서 목록 |
| GET | `/api/resume/{id}` | 자소서 상세 |
| GET | `/api/interview/questions/{resume_id}` | 예상 질문 |
| POST | `/api/interview/generate-questions` | 질문 생성 |
| GET | `/api/interview/mock/{session_id}` | 모의면접 결과 |

## Error Handling

- **자소서 없음**: "먼저 자소서를 생성하세요. /batch-resume 또는 http://localhost:3000/resume/new"
- **질문 생성 실패**: 예상 질문 섹션을 "질문 생성에 실패했습니다. Claude/OpenAI 연결을 확인하세요."로 대체하고 나머지 섹션은 계속 생성
- **모의면접 데이터 없음**: "과거 모의면접 데이터가 없습니다. /mock-drill로 연습 후 다시 생성하면 더 풍부한 가이드를 받을 수 있습니다."
