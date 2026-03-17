# 08. 도구 호출 가이드

## 도구별 호출 메커니즘

### 개발 시 도구 (터미널에서 사람이 실행)

| 도구 | 호출 방법 | 인증 |
|------|----------|------|
| Claude Code CLI | `claude` (터미널) | Claude OAuth (자동) |
| Codex CLI | `codex` (터미널) | ChatGPT OAuth (자동) |
| Claude Desktop | 데스크탑 앱 실행 | Claude 계정 로그인 |
| 서브에이전트 | 자연어 or `/agents` | Claude Code 세션 내 |
| 팀 에이전트 | 프롬프트로 팀 구성 | Claude Code 세션 내 |
| 스킬 | 자동 매칭 (설명 기반) | Claude Code 세션 내 |
| 훅 | 이벤트 자동 트리거 | settings.json 설정 |

### 앱 런타임 도구 (코드가 자동 호출)

| 도구 | 호출 방법 | 인증 |
|------|----------|------|
| Claude API | HTTP POST (httpx) | OAuth Bearer 토큰 |
| OpenAI API | HTTP POST (openai SDK) | API Key |
| Supabase | supabase-py / supabase-js | Publishable Key + Service Role Key |
| Brave Search | HTTP GET | API Key |
| 파일시스템 | Python pathlib / os | 없음 |

## 상세 호출 흐름

### Claude Code CLI

```bash
# 1. 프로젝트 루트에서 실행
cd careerlab
claude

# 2. CLAUDE.md 자동 로드 → 프로젝트 컨텍스트 파악

# 3. 태스크 지시
> "프로필 CRUD API 만들어줘"

# 4. Claude Code 내부 동작:
#    - 관련 스킬 자동 로드 (supabase-schema.md)
#    - 필요시 서브에이전트 스폰
#    - MCP 서버 도구 호출
#    - 파일 읽기/쓰기/Bash 실행
#    - 훅 자동 실행 (PostToolUse)
```

### Codex CLI

```bash
# 프론트엔드 작업 시
cd careerlab/frontend
codex

# ChatGPT OAuth 인증 → 구독 쿼터 사용
> "이 컴포넌트에 로딩 상태 추가해줘"

# Claude Code와 역할 분담:
# Claude Code → 백엔드 + 프롬프트
# Codex CLI → 프론트엔드
```

### Claude Desktop 리서치

```
1. Claude Desktop 앱 열기
2. 리서치 모드로 기업 조사
   "삼성전자 DX부문 서비스기획 채용 트렌드 분석"
3. 결과를 파일로 저장
   ~/Documents/career/research/삼성전자_DX.md
4. CareerLab 앱에서 활용:
   - 앱 UI에서 파일 경로 지정 → 자동 읽기
   - 또는 텍스트 직접 붙여넣기
```

### Claude API (앱 런타임)

```python
# backend/core/llm_router.py

async def call_claude(messages, model="claude-sonnet-4-6", stream=False):
    token = oauth_manager.access_token
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Authorization": f"Bearer {token}",
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": model,
                "max_tokens": 4096,
                "messages": messages,
                "stream": stream,
            },
            timeout=120.0,
        )
    return response.json()
```

### Supabase (앱 런타임)

```python
# backend — supabase-py
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# CRUD
result = supabase.table("career_entries").insert({...}).execute()
result = supabase.table("career_entries").select("*").eq("profile_id", pid).execute()

# 벡터 검색 (RPC)
result = supabase.rpc("match_career_entries", {
    "query_embedding": embedding,
    "match_threshold": 0.7,
    "match_count": 5,
}).execute()
```

```typescript
// frontend — @supabase/supabase-js
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

const { data } = await supabase
  .from('career_entries')
  .select('*')
  .eq('profile_id', profileId)
```

## 도구 간 데이터 교환 경로

```
Claude Desktop 리서치
    │ 파일 저장 (~/Documents/career/research/)
    ▼
CareerLab 앱 (파일 읽기 or 붙여넣기)
    │
    ├── Supabase (company_analyses 테이블에 저장)
    │
    ├── Claude API (자소서 생성 시 컨텍스트로 활용)
    │
    └── pgvector (벡터 매칭의 기업측 데이터)

Claude Code CLI
    │ 소스 코드 생성/수정 (careerlab/ 디렉토리)
    ▼
앱 재시작 → 변경사항 반영

Codex CLI
    │ 프론트 코드 생성/수정 (frontend/ 디렉토리)
    ▼
Next.js HMR → 즉시 반영
```
