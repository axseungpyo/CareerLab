# Plan: CareerLab v0.4.0 — 사용자 경험 강화

> 기존 핵심 기능(자소서/면접/첨삭)의 UX를 점진적으로 개선하여 취업 준비 품질을 높인다.

---

## User Intent Discovery

### 핵심 문제
CareerLab v0.3.0은 자소서 생성, 면접 코칭, 첨삭 분석의 핵심 파이프라인이 완성되었지만,
**반복적 개선 루프**와 **진행 상황 시각화**가 부족하여 사용자가 자신의 성장을 체감하기 어렵다.

### 대상 사용자
본인 전용 (단일 사용자 최적화). 추후 서비스화 고려하되 v0.4.0에서는 멀티유저 기능 불포함.

### 성공 기준
1. 홈 대시보드에서 지원 현황/점수 추이를 한눈에 파악 가능
2. 자소서를 반복 생성·첨삭하며 버전별 품질 변화를 추적 가능
3. 모의면접 결과를 답변 단위로 분석하고 약점을 체계적으로 복습 가능
4. 자소서/면접 데이터를 PDF/CSV로 내보내기 가능

---

## Alternatives Explored

| 접근법 | 설명 | 채택 여부 |
|--------|------|----------|
| **점진적 개선** | 기존 페이지에 기능을 하나씩 추가 | **채택** |
| 대시보드 중심 리빌드 | 새 /analytics 페이지를 메인으로 | 보류 (규모 큼) |
| 기능별 독립 모듈 | 4개 독립 PDCA 사이클 | 보류 (오버헤드) |

**채택 이유**: 기존 코드 위에 점진적으로 쌓아서 리스크를 최소화하면서 빠르게 가치를 전달.

---

## YAGNI Review

### v0.4.0에 포함 (In Scope)
- [x] 대시보드 차트 (recharts)
- [x] 자소서 버전 관리 UI
- [x] 첨삭 전/후 비교 (diff view)
- [x] 선택적 수정안 적용
- [x] 면접 답변별 점수/피드백 UI
- [x] 면접 세션 비교 + 오답노트
- [x] PDF/CSV 내보내기
- [x] 리서치 파일 자동 연결

### Out of Scope (v0.5.0+)
- [ ] 별도 /analytics 페이지 (대시보드 확장 후 재평가)
- [ ] 멀티 프로필 지원
- [ ] 음성 모의면접
- [ ] AI 자동 채용공고 추천
- [ ] 오프라인 모드 (PWA)
- [ ] 협업/공유 기능
- [ ] 알림/리마인더
- [ ] 자소서 템플릿 라이브러리

---

## 구현 계획

### Phase 1: 대시보드 강화 (1주)

#### 1.1 통계 API 엔드포인트

**신규 파일**: `backend/api/routes/stats.py`

```
GET /api/stats/summary
응답: {
  total_resumes: int,
  total_applications: int,  // status="submitted" 건수
  pass_rate: float,          // result="pass" / total submitted
  total_mock_sessions: int,
  avg_mock_score: float,
  recent_feedback_avg: { structure, content, expression, strategy }
}

GET /api/stats/trends
응답: {
  mock_scores: [{ date, score, grade }],         // 최근 10개 세션
  feedback_scores: [{ date, structure, content, expression, strategy }],  // 최근 10개 리포트
  resumes_by_month: [{ month, count }]
}
```

**수정 파일**: `backend/main.py` — stats 라우터 등록

#### 1.2 홈 대시보드 차트

**수정 파일**: `frontend/app/page.tsx`

- recharts 라이브러리 추가 (`pnpm add recharts`)
- 기존 프로필 진행률 링 + 빠른 액션 카드 유지
- 새로 추가:
  - **지원 현황 카드**: 총 지원 수, 합격률, 진행 중 건수
  - **면접 점수 추이**: LineChart (날짜별 overall_score)
  - **자소서 품질 추이**: BarChart (4축 평균 점수 변화)
  - **최근 활동 타임라인**: 자소서 생성, 면접, 첨삭 이력

---

### Phase 2: 자소서 품질 개선 루프 (1주)

#### 2.1 버전 관리

**수정 파일**:
- `backend/modules/resume/generator.py` — 같은 question 재생성 시 version 증가 로직
- `backend/api/routes/resume.py` — `GET /api/resume/{id}/items/{item_id}/versions` 엔드포인트 추가

**프론트엔드**:
- `frontend/app/resume/[id]/page.tsx` — 항목 카드에 버전 배지 + "이전 버전" 드롭다운
- 버전 선택 시 해당 텍스트 표시, "이 버전으로 복원" 버튼

#### 2.2 첨삭 전/후 비교

**수정 파일**: `frontend/app/review/page.tsx`

- 첨삭 결과 표시에 "비교 보기" 토글 추가
- 원문과 수정본을 사이드바이사이드로 표시
- 변경된 부분을 하이라이트 (추가: 녹색, 삭제: 빨간색)
- 라이브러리: 자체 구현 (문장 단위 diff) 또는 `diff-match-patch` 경량 라이브러리

#### 2.3 선택적 수정안 적용

**수정 파일**:
- `backend/api/routes/interview.py` — `POST /api/interview/review/apply-selective/{report_id}` 엔드포인트
  - Body: `{ suggestion_indices: [0, 2, 3] }` — 적용할 제안의 인덱스
- `backend/modules/resume/feedback.py` — `apply_selective_suggestions()` 메서드 추가
- `frontend/app/review/page.tsx` — 각 제안에 체크박스, "선택 적용" 버튼

---

### Phase 3: 면접 훈련 강화 (1주)

#### 3.1 답변별 점수/피드백 UI

**수정 파일**: `frontend/app/interview/result/[id]/page.tsx`

현재: 전체 점수 + 등급만 표시
변경: 답변별 카드 추가
- 면접관 질문
- 내 답변 요약
- 점수 배지 (1-10, 색상 코딩)
- 피드백 텍스트
- "모범 답변 보기" 토글 (접고 펴기)

#### 3.2 세션 비교

**신규 파일**: `frontend/app/interview/compare/page.tsx`

- 같은 자소서의 모의면접 세션 2개를 선택하여 비교
- 비교 항목: 종합 점수, 5축 점수, 등급, 강점/약점
- RadarChart로 5축 비교 시각화 (recharts)

**수정 파일**: `backend/api/routes/interview.py`
- `GET /api/interview/mock/sessions/{resume_id}` — 특정 자소서의 모든 세션 목록

#### 3.3 오답노트

**신규 파일**: `frontend/app/interview/weak-points/page.tsx`

- 모든 모의면접에서 점수가 낮은 답변(6점 이하) 수집
- 카테고리별 그룹핑 (자소서 기반/직무 역량/기업 적합/인성/압박)
- 각 오답에 모범 답변 + 개선 팁 표시
- "다시 연습하기" 버튼 → 해당 질문으로 mock-drill 시작

**백엔드**: 기존 evaluation의 `answer_feedback` 데이터에서 low-score 필터링 (추가 API 불필요, 프론트에서 처리)

---

### Phase 4: 데이터 활용 (0.5주)

#### 4.1 PDF 내보내기

**수정 파일**: `backend/modules/resume/exporter.py`

현재: DOCX만 지원
추가: PDF 내보내기 (Playwright PDF 또는 WeasyPrint)

```
GET /api/resume/{id}/export?format=pdf
GET /api/resume/{id}/export?format=docx  (기존)
```

**프론트엔드**: 내보내기 버튼에 포맷 선택 드롭다운 추가

#### 4.2 CSV 내보내기

**신규 엔드포인트**:
```
GET /api/stats/export/resumes?format=csv
  → 자소서 목록 + 기업명 + 상태 + 첨삭 점수

GET /api/stats/export/interviews?format=csv
  → 면접 세션 + 점수 + 등급 + 날짜
```

#### 4.3 리서치 파일 자동 연결

**수정 파일**: `backend/modules/resume/generator.py`

현재: 리서치 파일 임포트만 가능, 자소서 생성에 미반영
변경: `generate()` 메서드에서 company_name으로 리서치 파일을 검색하여 프롬프트 컨텍스트에 자동 주입

```python
# generator.py 변경
research_files = self._get_research_for_company(company_name)
if research_files:
    variables["research_context"] = "\n".join(research_files)
```

**수정 파일**: `backend/config/prompts/resume_gen.yaml`
- `{{ research_context }}` 변수 추가 (선택적)

---

## 수정 대상 파일 요약

### 신규 생성
| 파일 | 용도 |
|------|------|
| `backend/api/routes/stats.py` | 통계 API |
| `frontend/app/interview/compare/page.tsx` | 세션 비교 |
| `frontend/app/interview/weak-points/page.tsx` | 오답노트 |

### 주요 수정
| 파일 | 변경 내용 |
|------|----------|
| `frontend/app/page.tsx` | 대시보드 차트 추가 |
| `frontend/app/resume/[id]/page.tsx` | 버전 관리 UI |
| `frontend/app/review/page.tsx` | diff 뷰 + 선택적 적용 |
| `frontend/app/interview/result/[id]/page.tsx` | 답변별 피드백 카드 |
| `backend/modules/resume/generator.py` | 버전 증가 + 리서치 연결 |
| `backend/modules/resume/exporter.py` | PDF 내보내기 |
| `backend/modules/resume/feedback.py` | 선택적 적용 메서드 |
| `backend/api/routes/resume.py` | 버전 목록 API |
| `backend/api/routes/interview.py` | 세션 목록 + 선택적 적용 API |
| `backend/config/prompts/resume_gen.yaml` | research_context 변수 |
| `backend/main.py` | stats 라우터 등록 |

---

## Brainstorming Log

| Phase | 질문 | 결정 |
|-------|------|------|
| Intent | 핵심 방향 | 사용자 경험 강화 |
| Intent | 핵심 니즈 | 대시보드 + 자소서 루프 + 면접 강화 + 데이터 활용 (전체) |
| Intent | 대상 사용자 | 본인 전용, 추후 서비스화 고려 |
| Alternatives | 구현 접근법 | 점진적 개선 (기존 페이지 위에 기능 추가) |
| YAGNI | v0.4.0 스코프 | 7개 기능 확정, 멀티프로필/음성면접/AI추천 등 Out of Scope |
| Validation | 구성 및 순서 | Phase 1→4 순서 승인 |

---

## 검증

```bash
# Phase 1 검증
cd frontend && npx tsc --noEmit
curl http://localhost:8000/api/stats/summary
# 대시보드에서 차트 렌더링 확인

# Phase 2 검증
# 같은 질문 재생성 → 버전 증가 확인
# 첨삭 후 diff 뷰 표시 확인
# 선택적 적용 후 원하는 제안만 반영 확인

# Phase 3 검증
# 면접 결과 페이지에서 답변별 카드 표시 확인
# 두 세션 비교 → RadarChart 렌더링 확인
# 오답노트에서 low-score 답변 수집 확인

# Phase 4 검증
curl http://localhost:8000/api/resume/{id}/export?format=pdf -o test.pdf
curl http://localhost:8000/api/stats/export/resumes?format=csv -o test.csv
# 리서치 파일 있는 기업의 자소서 생성 → 컨텍스트 포함 확인

# 전체 테스트
cd backend && python -m pytest tests/ -v
```

---

## 일정

| Phase | 기간 | 기능 |
|-------|------|------|
| Phase 1 | 1주 | 대시보드 (통계 API + 차트) |
| Phase 2 | 1주 | 자소서 (버전 관리 + diff + 선택적 적용) |
| Phase 3 | 1주 | 면접 (답변별 피드백 + 세션 비교 + 오답노트) |
| Phase 4 | 0.5주 | 데이터 (PDF/CSV + 리서치 연결) |
| **합계** | **3.5주** | |
