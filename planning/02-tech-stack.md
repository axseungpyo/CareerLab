# 02. 기술 스택

## 확정 스택 총괄

```
카테고리          기술                      역할
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
프론트엔드        Next.js 15               App Router, TypeScript
                  Vercel AI SDK            채팅 스트리밍 (useChat)
                  shadcn/ui                UI 컴포넌트
                  Tailwind CSS             스타일링
                  pnpm                     패키지 관리

백엔드            FastAPI                  Python 3.11+
                  httpx                    비동기 HTTP (LLM 호출)
                  supabase-py              Supabase Python 클라이언트
                  uv                       Python 패키지 관리

데이터베이스      Supabase                 PostgreSQL + pgvector
                  Supabase Storage         파일 저장 (이력서, 자소서)
                  Supabase Auth            인증 (추후 배포 시)

LLM               Claude API (CLI/API Key)  자소서/면접/첨삭 (메인)
                  OpenAI API (Codex CLI/OAuth/Key) 파싱/구조화 (보조)

검색              Brave Search API         기업 정보 실시간 검색

개발 도구         Claude Code CLI          백엔드 + 프롬프트 개발
                  Codex CLI                프론트엔드 개발
                  Claude Desktop           심층 리서치 (수동)
```

## LLM 라우팅 테이블

| 태스크 | 모델 | 인증 | 이유 |
|--------|------|------|------|
| 자소서 생성 | claude-sonnet-4 | CLI / API Key | 한국어 품질 + 긴 문맥 |
| 자소서 첨삭 | claude-sonnet-4 | CLI / API Key | 심층 분석 |
| 모의면접 진행 | claude-sonnet-4 | CLI / API Key | 대화형 + 스트리밍 |
| 기업/채용공고 분석 | gpt-4o-mini | Codex CLI / OAuth / API Key | 구조화 + 저비용 |
| 예상질문 생성 | claude-haiku-4.5 | CLI / API Key | 빠른 응답 + 충분한 품질 |
| 이력서 파싱 | gpt-4o-mini | Codex CLI / OAuth / API Key | 비정형→정형 변환 |
| 벡터 임베딩 | text-embedding-3-small | Codex CLI / OAuth / API Key | 1536차원 임베딩 |

## 인증 방식

### Claude (2가지)
| 모드 | 설명 | 구현 파일 |
|------|------|----------|
| `cli` (기본) | `claude -p` 로컬 CLI 호출, 구독(Pro/Max) 인증 자동 사용 | `core/claude_cli.py` |
| `api_key` | Anthropic API Key 직접 입력 (`x-api-key` 헤더) | `core/llm_router.py` |

> 참고: Anthropic이 2026년 1월부터 제3자 앱의 OAuth 토큰 사용을 기술적으로 차단.
> Claude OAuth 방식은 더 이상 사용 불가. CLI 또는 API Key만 지원.

### OpenAI (3가지)
| 모드 | 설명 | 구현 파일 |
|------|------|----------|
| `codex_cli` | `~/.codex/auth.json`에서 ChatGPT OAuth 토큰 추출 → OpenAI SDK 주입 | `core/codex_cli.py` |
| `oauth` | `~/.openai/.credentials.json` 토큰 파일 로드 | `core/oauth_loader.py` |
| `api_key` | OpenAI API Key 직접 입력 | `core/llm_router.py` |

### 키 해석 우선순위
1. 설정 UI(`/settings`)에서 입력한 값 (`data/app_settings.json`)
2. CLI/OAuth 토큰 파일
3. `.env` 환경변수 fallback

### 연결 상태 확인
- `GET /api/settings/status` — Claude/OpenAI/Supabase/Brave 상태 체크
- 설정 UI에서 초록/빨강 dot으로 실시간 표시

## 비용 구조

```
월간 비용 추정
────────────────────────────────────────
Claude CLI (자소서/면접)     $0 (구독 포함) 또는 API Key 종량제
OpenAI Codex CLI (파싱)      $0 (구독 포함) 또는 API Key $1~3
Brave Search API             $0 (무료 2,000쿼리/월)
Supabase                     $0 (Free 티어 500MB)
────────────────────────────────────────
합계                         구독료만 또는 구독료 + $1~3/월

※ Claude Max 권장 (쿼터 여유)
```

## LLM 호출 에러 핸들링 전략

```
에러 유형              재시도 정책                    Fallback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
네트워크 에러          exponential backoff (최대 3회)  에러 메시지 반환
429 Rate Limit         Retry-After 헤더 기반 대기      에러 메시지 반환
401 토큰 만료          토큰 파일 재로드 후 1회 재시도   UI 갱신 안내
500 서버 에러          exponential backoff (최대 2회)  에러 메시지 반환
스트리밍 중단          연결 재시도 (최대 1회)           부분 결과 저장
```

- 모든 재시도는 `tenacity` 라이브러리 사용
- 최대 총 대기 시간: 30초
- 재시도 실패 시 한국어 에러 메시지 + 원인 설명 반환

## Supabase Free 티어 용량 관리

```
리소스               Free 티어 한도    예상 사용량          대응
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DB 용량              500MB            ~50MB (1년 기준)     여유
벡터 임베딩          -                ~6KB/건 × 1536dim    최대 ~80,000건
Storage              1GB              ~100MB (파일 기준)   여유
Edge Functions       500K/월          미사용               -
```

- 임베딩 대상 텍스트: career_entries의 content 필드 (최대 2000자 제한)
- 2000자 초과 시 앞 2000자만 임베딩, 원문은 전체 저장
- 현실적 사용량(경력 100건 이하)에서는 Free 티어 충분

## 데이터 백업/마이그레이션

### Supabase CLI 기반 백업

```bash
# 전체 DB 덤프
supabase db dump -f backup_$(date +%Y%m%d).sql

# 복원
supabase db reset && psql $DATABASE_URL < backup_20260314.sql

# Storage 파일은 Supabase 대시보드에서 수동 다운로드
```

### 로컬 → 배포 전환 절차

1. Supabase 새 프로젝트 생성 (배포용)
2. `supabase db push` → 스키마 마이그레이션 적용
3. `supabase db dump` → 로컬 데이터 덤프
4. 배포 DB에 데이터 복원
5. 환경변수(URL, Key) 교체
6. Storage 파일 재업로드

## Supabase vs 기존 설계 비교

| 항목 | 기존 (SQLite+ChromaDB) | 변경 (Supabase) |
|------|------------------------|-----------------|
| 관계형 DB | SQLite (로컬 파일) | PostgreSQL (클라우드) |
| 벡터 검색 | ChromaDB (별도 서버) | pgvector (DB 내장) |
| 파일 저장 | 로컬 data/exports/ | Supabase Storage |
| 인증 | 없음 | Supabase Auth (준비) |
| 실시간 | 불가 | Supabase Realtime (준비) |
| 배포 전환 | DB 마이그레이션 필요 | 그대로 사용 |
