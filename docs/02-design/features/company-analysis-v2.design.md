# Design: 기업분석 고도화 v0.9 — Sprint 1

> Feature: `company-analysis-v2`
> Phase: Design
> Sprint: 1 of 3
> Scope: Serper 프로바이더 + 웹 검색 토글 + 상세 페이지 4-탭 UX

---

## 1. Sprint 1 목표

| # | 기능 | 완료 기준 |
|---|------|----------|
| 1 | Serper 프로바이더 추가 | Serper API로 3카테고리 검색 성공, Settings UI에서 선택 가능 |
| 2 | 웹 검색 ON/OFF 토글 | 토글 OFF 시 채용공고만 Claude 분석, 웹 검색 비용 $0 |
| 3 | 상세 페이지 4-탭 UX | 요약/요구사항/전략/리서치 탭으로 정보 분리 |

---

## 2. 백엔드 상세 설계

### 2.1 Serper 프로바이더 (`backend/core/research.py`)

**추가 함수**: `_search_serper(query, max_results) → list[dict]`

```python
async def _search_serper(query: str, max_results: int = 5) -> list[dict]:
    """Google SERP via Serper.dev API."""
    settings = load_app_settings()
    api_key = settings.llm.search.serper_api_key
    if not api_key:
        return []

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query, "gl": "kr", "hl": "ko", "num": max_results},
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("organic", [])[:max_results]:
        results.append({
            "title": item.get("title", ""),
            "description": item.get("snippet", ""),
            "url": item.get("link", ""),
        })
    # Serper의 knowledgeGraph가 있으면 첫 번째로 추가
    kg = data.get("knowledgeGraph")
    if kg:
        results.insert(0, {
            "title": kg.get("title", ""),
            "description": kg.get("description", ""),
            "url": kg.get("website", ""),
        })
    return results
```

**`search_company_deep()` 수정** — provider 분기에 "serper" 추가:

```python
# 기존 tavily, perplexity 분기 뒤에:
elif provider == "serper":
    import asyncio
    tasks = {key: _search_serper(query, max_results=3) for key, query in queries.items()}
    gathered = await asyncio.gather(*tasks.values(), return_exceptions=True)
    for key, result in zip(tasks.keys(), gathered):
        results[key] = result if isinstance(result, list) else []
```

### 2.2 Settings 모델 (`backend/core/app_settings.py`)

**SearchSettings 변경**:

```python
class SearchSettings(BaseModel):
    enabled: bool = True            # 웹 검색 ON/OFF (기존)
    provider: str = "tavily"        # "tavily" | "perplexity" | "serper" (serper 추가)
    tavily_keys: list[TavilyKeyEntry] = []
    perplexity_api_key: str = ""
    serper_api_key: str = ""        # ← 신규 필드
```

### 2.3 Settings API (`backend/api/routes/settings.py`)

**status 엔드포인트 수정** — Serper 연결 상태 표시:

```python
# search status 분기에 serper 추가
if search.provider == "serper":
    if search.serper_api_key:
        status["search"] = {"status": "valid", "message": "Serper 연결됨"}
    else:
        status["search"] = {"status": "missing", "message": "Serper API Key가 필요합니다."}
```

### 2.4 Company API 추가 (`backend/api/routes/company.py`)

**`PUT /{analysis_id}`** — 분석 결과 부분 업데이트 (Sprint 2 키워드 편집용, Sprint 1에서 API만 선 구현):

```python
@router.put("/{analysis_id}")
async def update_analysis(analysis_id: str, data: dict):
    """Partial update of analysis fields (keywords, requirements, etc.)."""
    _validate_uuid(analysis_id)
    allowed = {"keywords", "requirements", "talent_profile", "research_notes"}
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="업데이트할 필드가 없습니다.")
    analyzer = CompanyAnalyzer()
    analyzer._db.table("company_analyses").update(update_data).eq("id", analysis_id).execute()
    return analyzer.get_analysis(analysis_id)
```

---

## 3. 프론트엔드 상세 설계

### 3.1 Settings 페이지 — Serper 프로바이더 추가

**파일**: `frontend/app/settings/page.tsx`

**변경**:
- Search Provider Select에 `<SelectItem value="serper">Serper (Google SERP)</SelectItem>` 추가
- `provider === "serper"` 조건부 Serper API Key Input 필드
- 웹 검색 ON/OFF 토글은 이미 `search.enabled`로 존재 — UI에 Switch 컴포넌트 명시 추가

### 3.2 상세 페이지 4-탭 UX 개편

**파일**: `frontend/app/company/[id]/page.tsx` (전면 재작성)

#### 탭 구조

```
[요약] [요구사항] [전략] [리서치]
```

#### 요약 탭 (기본)

```
┌──────────────────────────────────────────────┐
│ ← 뒤로     삼성전자     [재분석] [삭제]        │
│ 2026년 3월 19일 분석 · https://recruit.xxx    │
├──────────────────────────────────────────────┤
│ 기업 개요                                     │
│ ┌────────┬────────┬────────┬────────┐        │
│ │ 산업    │ 문화    │ 단계   │ 동향    │        │
│ │ 반도체  │ 성과중심│ 성숙   │ AI반도체│        │
│ └────────┴────────┴────────┴────────┘        │
│                                               │
│ 인재상                                        │
│ [열정] [창의혁신] [도덕성]                     │
│ "기술 전문성과 도전 정신을 겸비한..."           │
│                                               │
│ 핵심 키워드                                    │
│ [반도체] [AI] [팀워크] [데이터분석] [리더십]    │
│                                               │
│ ─────────────────────────────────             │
│ [자소서 생성] [면접 준비] [지원 등록]           │
└──────────────────────────────────────────────┘
```

#### 요구사항 탭

```
┌──────────────────────────────────────────────┐
│ 필터: [전체] [필수] [우대] [기술] [숨겨진]     │
├──────────────────────────────────────────────┤
│ [필수] 반도체 공정 이해 및 분석 능력           │
│ [필수] 데이터 기반 문제 해결 역량              │
│ [우대] AI/ML 관련 프로젝트 경험               │
│ [기술] Python, MATLAB, R 중 1개 이상          │
│ [숨겨진] 야근/주말 근무에 대한 유연한 태도      │
│                                               │
│ 총 27개 요구사항                              │
└──────────────────────────────────────────────┘
```

#### 전략 탭

```
┌──────────────────────────────────────────────┐
│ 자소서 전략                                   │
│ ───────────                                   │
│ 핵심 어필 포인트:                              │
│  ① 기술 전문성 + 실무 경험 STAR 구조           │
│  ② 회사 위기 인식 → 차별화                     │
│  ③ 핵심가치와 경험 1:1 연결                    │
│                                               │
│ 차별화 전략: "단순 기술 나열이 아닌..."         │
│ 톤앤매너: 전문적이면서 열정적                   │
│                                               │
│ 면접 준비                                     │
│ ───────────                                   │
│ 예상 주제: [기술면접] [인성면접] [PT면접]       │
│ 기업 특유: "삼성 GSAT 후 다단계 면접..."        │
│                                               │
│ [면접 준비 시작 →]                             │
└──────────────────────────────────────────────┘
```

#### 리서치 탭

```
┌──────────────────────────────────────────────┐
│ 웹 리서치 결과                                │
│                                               │
│ 🏢 기업문화 (3건)                             │
│  · 삼성전자 핵심가치 - samsung.com             │
│  · 조직문화 분석 - brunch.co.kr               │
│                                               │
│ 📰 최근 뉴스 (3건)                            │
│  · 2026 상반기 실적... - news.com              │
│                                               │
│ 💼 채용 정보 (3건)                             │
│  · 면접 후기 분석 - jasoseol.com               │
│                                               │
│ ※ 웹 검색 미사용 시:                          │
│ "이 분석은 웹 검색 없이 수행되었습니다."        │
│ [웹 리서치 추가 실행]                          │
└──────────────────────────────────────────────┘
```

#### 컴포넌트 설계

```typescript
// Tabs 구조 (shadcn/ui Tabs 사용)
<Tabs defaultValue="summary">
  <TabsList>
    <TabsTrigger value="summary">요약</TabsTrigger>
    <TabsTrigger value="requirements">요구사항</TabsTrigger>
    <TabsTrigger value="strategy">전략</TabsTrigger>
    <TabsTrigger value="research">리서치</TabsTrigger>
  </TabsList>
  <TabsContent value="summary"><SummaryTab /></TabsContent>
  <TabsContent value="requirements"><RequirementsTab /></TabsContent>
  <TabsContent value="strategy"><StrategyTab /></TabsContent>
  <TabsContent value="research"><ResearchTab /></TabsContent>
</Tabs>
```

### 3.3 새 분석 페이지 — 웹 검색 토글

**파일**: `frontend/app/company/new/page.tsx`

**추가 UI**:
```
[기업명] [채용공고 URL]
[채용공고 본문 textarea]

☐ 웹 리서치 포함 (API 비용 발생)
  └ 체크 시: 기업 최신 뉴스/문화/채용 트렌드를 웹에서 검색하여 분석에 반영

[분석 시작]
```

**API 호출**: 체크 해제 시 `search.enabled = false`를 분석 요청에 포함하거나, 백엔드에서 설정 확인

---

## 4. 구현 순서

```
Step 1: SearchSettings에 serper_api_key 필드 추가
Step 2: research.py에 _search_serper() 함수 추가
Step 3: search_company_deep()에 serper 분기 추가
Step 4: Settings UI에 Serper 프로바이더 옵션 + API Key 필드 추가
Step 5: company/[id]/page.tsx 4-탭 구조로 재작성
Step 6: company/new/page.tsx에 웹 검색 토글 추가
Step 7: company.py에 PUT /{id} 엔드포인트 추가
Step 8: 통합 테스트 (Serper 검색 + 4-탭 표시 + 토글)
```

---

## 5. 파일 변경 목록

| 파일 | 변경 유형 | 상세 |
|------|----------|------|
| `backend/core/research.py` | 수정 | `_search_serper()` 추가, `search_company_deep()` serper 분기 |
| `backend/core/app_settings.py` | 수정 | `SearchSettings.serper_api_key` 필드 추가 |
| `backend/api/routes/settings.py` | 수정 | status에 serper 상태 표시 |
| `backend/api/routes/company.py` | 수정 | `PUT /{analysis_id}` 엔드포인트 추가 |
| `frontend/app/company/[id]/page.tsx` | **재작성** | 4-탭 구조 (요약/요구사항/전략/리서치) |
| `frontend/app/company/new/page.tsx` | 수정 | 웹 검색 ON/OFF 체크박스 |
| `frontend/app/settings/page.tsx` | 수정 | Serper 프로바이더 옵션 + API Key 필드 |

---

## 6. 테스트 체크리스트

- [ ] Serper API Key 입력 후 검색 정상 동작
- [ ] 프로바이더 Tavily→Serper 전환 시 동일 품질 검색
- [ ] 웹 검색 OFF 시 채용공고만으로 분석 완료
- [ ] 상세 페이지 4-탭 전환 정상
- [ ] 요구사항 태그별 필터 동작
- [ ] 리서치 탭 — 웹 검색 미사용 시 안내 메시지 표시
- [ ] PUT API로 키워드/요구사항 업데이트 정상
- [ ] Settings status에 Serper 연결 상태 표시
