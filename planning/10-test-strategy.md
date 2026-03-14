# 10. 테스트 전략

## 전략 개요
통합 테스트 중심. 핵심 파이프라인의 end-to-end 흐름을 검증하고, 복잡한 비즈니스 로직만 단위 테스트.

## 테스트 도구

```
카테고리          도구                      용도
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
백엔드 테스트     pytest + pytest-asyncio    API 엔드포인트 + 서비스 로직
HTTP 모킹        respx                      외부 API(Claude, OpenAI) 응답 모킹
프론트 테스트     vitest + testing-library    컴포넌트 단위 테스트 (선택)
```

## 테스트 범위

### 필수 통합 테스트 (Phase별)

| Phase | 테스트 대상 | 검증 항목 |
|-------|------------|----------|
| 1 | OAuth 토큰 로더 | 토큰 로드, 만료 감지, 재로드 |
| 1 | LLM 라우터 | TaskType별 올바른 모델 선택, 에러 핸들링 |
| 1 | 프롬프트 엔진 | YAML 로드, Jinja2 변수 주입, 조립 결과 |
| 1 | 임베딩 엔진 | 텍스트→벡터 변환, Supabase 저장/검색 |
| 2 | 프로필 API | CRUD 전체 흐름, 벡터 임베딩 자동 생성 |
| 2 | 파일 파싱 | PDF/DOCX → 구조화 JSON 변환 |
| 3 | 자소서 생성 | 기업분석 → 매칭 → 프롬프트 조립 → 생성 전체 흐름 |
| 4 | 첨삭 엔진 | 4축 분석 점수 + 수정본 생성 |
| 5 | 모의면접 | 세션 생성 → 채팅 → 종료 → 평가 흐름 |

### 단위 테스트 (복잡 로직만)

- `prompt_engine.py` — Jinja2 템플릿 조립 로직
- `oauth_loader.py` — 토큰 파싱/만료 판단 로직
- `modules/*/models.py` — Pydantic 모델 검증 규칙

### LLM 호출 테스트 원칙

```
실제 API 호출은 테스트하지 않음.
respx로 Claude/OpenAI 응답을 모킹하여:
- 정상 응답 → 파싱/저장 검증
- 에러 응답 → 재시도/fallback 검증
- 스트리밍 응답 → SSE 전달 검증
```

## 테스트 디렉토리 구조

```
backend/
  tests/
    conftest.py              # Supabase 테스트 클라이언트, 픽스처
    test_oauth_loader.py
    test_llm_router.py
    test_prompt_engine.py
    test_embedding.py
    test_profile_api.py
    test_resume_api.py
    test_interview_api.py
    test_review_api.py
```

## 실행 명령

```bash
# 전체 테스트
cd backend && python -m pytest tests/ -v

# 특정 파일
cd backend && python -m pytest tests/test_llm_router.py -v

# 특정 함수
cd backend && python -m pytest tests/test_llm_router.py::test_route_to_claude -v

# 커버리지
cd backend && python -m pytest tests/ --cov=. --cov-report=term-missing
```

## 테스트 작성 시점
- 각 Phase 구현 완료 후, 해당 Phase의 통합 테스트 작성
- 버그 수정 시 재발 방지 테스트 추가
