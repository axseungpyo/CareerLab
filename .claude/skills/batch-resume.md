---
description: 여러 기업 자소서를 한 번에 생성하고 저장합니다
---

# /batch-resume

여러 기업의 채용공고를 입력받아, 기업 분석 → 시맨틱 매칭 → 자소서 생성 → 저장까지 일괄 수행합니다.

## Prerequisites

- 백엔드 서버 실행 중 (`http://localhost:8000`)
- 프로필 + 경력 항목이 Supabase에 등록되어 있어야 함
- Claude/OpenAI 서비스가 설정에서 활성화되어 있어야 함

## Steps

### 1. 서버 상태 확인

`GET http://localhost:8000/api/settings/status`를 호출하여 Claude, OpenAI, Supabase 연결 상태를 확인한다.
하나라도 `missing`이면 사용자에게 `/settings` 페이지에서 설정하라고 안내하고 중단한다.

### 2. 프로필 확인

`GET http://localhost:8000/api/profile`을 호출하여 프로필이 존재하는지 확인한다.
`profile_id`를 추출한다. 프로필이 없으면 먼저 `/profile` 페이지에서 생성하라고 안내한다.

### 3. 기업 목록 입력받기

사용자에게 다음 형식으로 기업 정보를 요청한다:

```
다음 정보를 기업별로 알려주세요:
1. 기업명
2. 채용공고 (전문 또는 핵심 요약)
3. (선택) 특별히 강조할 키워드나 경험

공통 설정:
- 톤: 전문적 / 진솔한 / 열정적 / 차분한 (기본: 전문적)
- 글자수 제한: 숫자 (기본: 500)
```

### 4. 기업별 자소서 생성 루프

각 기업에 대해 순차적으로 실행한다:

#### 4a. 기업 분석
```
POST http://localhost:8000/api/resume/analyze-company
Body: {
  "company_name": "{기업명}",
  "job_posting_text": "{채용공고}",
  "job_posting_url": null
}
```
응답에서 `id`(company_analysis_id), `requirements`, `keywords`를 추출한다.
간단한 분석 요약을 사용자에게 표시한다:
```
[삼성전자] 분석 완료
- 키워드: 반도체, AI, 글로벌, 혁신
- 핵심 요구: 데이터 분석 역량, 프로젝트 리드 경험
```

#### 4b. 자소서 레코드 생성
```
POST http://localhost:8000/api/resume
Body: {
  "profile_id": "{profile_id}",
  "company_analysis_id": "{analysis_id}",
  "title": "{기업명} 자소서"
}
```
`resume_id`를 저장한다.

#### 4c. 질문별 자소서 생성

분석 결과의 `questions` 배열에서 각 질문을 추출한다.
질문이 없으면 "지원동기를 서술해 주세요"를 기본 질문으로 사용한다.

각 질문에 대해:
```
POST http://localhost:8000/api/resume/generate
Body: {
  "profile_id": "{profile_id}",
  "company_analysis_id": "{analysis_id}",
  "question": "{질문}",
  "char_limit": {글자수},
  "tone": "{톤}"
}
```
이 엔드포인트는 SSE 스트리밍이다. 스트림을 소비하여 전체 텍스트를 수집한다.
Vercel AI Data Stream 프로토콜: `0:` 접두사가 데이터, `e:` 접두사가 종료 신호.

수집된 텍스트를 저장한다:
```
POST http://localhost:8000/api/resume/items
Body: {
  "resume_id": "{resume_id}",
  "question": "{질문}",
  "answer": "{생성된 텍스트}",
  "char_limit": {글자수},
  "tone": "{톤}"
}
```

#### 4d. 진행 상황 표시

각 기업 완료 시 다음과 같이 표시:
```
[2/5] 카카오 자소서 생성 완료 (3문항, 평균 487자)
```

### 5. 요약 테이블 출력

모든 기업 처리 후 요약 테이블을 출력한다:

```markdown
## 일괄 생성 결과

| 기업 | 문항수 | 평균 글자수 | 상태 | 링크 |
|------|--------|-----------|------|------|
| 삼성전자 | 3 | 487 | 완료 | http://localhost:3000/resume/{id} |
| 카카오 | 2 | 512 | 완료 | http://localhost:3000/resume/{id} |
| 네이버 | 3 | 495 | 실패 (OpenAI 타임아웃) | - |

총 5개 기업 중 4개 성공, 1개 실패
```

### 6. 후속 작업 안내

```
다음 단계를 추천합니다:
- /bulk-review → 생성된 자소서 전체 일괄 첨삭
- /interview-prep {기업명} → 면접 준비 가이드 생성
- 웹 UI에서 개별 수정: http://localhost:3000/resume/{id}
```

## API Endpoints Used

| Method | Endpoint | 용도 |
|--------|----------|------|
| GET | `/api/settings/status` | 서비스 연결 확인 |
| GET | `/api/profile` | 프로필 조회 |
| POST | `/api/resume/analyze-company` | 기업 분석 |
| POST | `/api/resume` | 자소서 레코드 생성 |
| POST | `/api/resume/generate` | 자소서 생성 (SSE) |
| POST | `/api/resume/items` | 생성 결과 저장 |

## Error Handling

- **서버 미실행**: "백엔드를 먼저 시작하세요: `cd backend && uv run uvicorn main:app --reload --port 8000`"
- **프로필 없음**: "먼저 http://localhost:3000/profile 에서 프로필을 생성하세요."
- **기업 분석 실패**: 해당 기업을 건너뛰고 다음 기업으로 진행. 실패 원인을 요약에 표시.
- **SSE 스트리밍 실패**: 3초 대기 후 1회 재시도. 재시도 실패 시 해당 문항을 "[생성 실패]"로 표시.
- **경력 매칭 0건**: "시맨틱 매칭 결과가 없습니다. 경력 항목을 추가하면 품질이 향상됩니다." 경고 후 계속 진행.
