"""Web search integration for company research.

Supports Tavily (AI-native, multi-key with auto-rotation) and Perplexity Sonar (search+summary).
Provider is selected via runtime settings (search_provider field).
"""

import httpx

from core.app_settings import load_app_settings


# Track which Tavily key index to try next (in-memory, resets on restart)
_tavily_key_index: int = 0


# ── Public API ──


async def search_company(company_name: str, max_results: int = 5) -> list[dict]:
    """Search for company information using the configured search provider (legacy)."""
    settings = load_app_settings()
    search = settings.llm.search

    if not search.enabled:
        return []

    provider = search.provider
    if provider == "tavily":
        query = f"{company_name} 기업정보 채용 인재상 최근 뉴스"
        return await _search_tavily(query, max_results)
    elif provider == "perplexity":
        return await _search_perplexity(company_name, search.perplexity_api_key, max_results)

    return []


async def search_company_deep(company_name: str) -> dict[str, list[dict]]:
    """Deep company research — 3 parallel category searches.

    Returns:
        {
            "culture": [...],  # 기업 개요, 조직문화, 핵심가치
            "news": [...],     # 최근 뉴스, 사업 동향, 실적
            "hiring": [...],   # 채용 트렌드, 면접 후기, 합격 전략
        }
    """
    settings = load_app_settings()
    search = settings.llm.search

    if not search.enabled:
        return {"culture": [], "news": [], "hiring": []}

    queries = {
        "culture": f"{company_name} 기업문화 조직문화 핵심가치 비전 인재상",
        "news": f"{company_name} 최근 뉴스 사업 동향 실적 2025 2026",
        "hiring": f"{company_name} 채용 면접 후기 합격 자소서 팁",
    }

    provider = search.provider
    results: dict[str, list[dict]] = {}

    if provider == "tavily":
        import asyncio
        tasks = {
            key: _search_tavily(query, max_results=3)
            for key, query in queries.items()
        }
        gathered = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for key, result in zip(tasks.keys(), gathered):
            results[key] = result if isinstance(result, list) else []

    elif provider == "perplexity":
        api_key = search.perplexity_api_key
        import asyncio
        perplexity_queries = {
            "culture": f"{company_name}의 기업문화, 조직문화, 핵심가치, 인재상을 알려줘.",
            "news": f"{company_name}의 최근 뉴스, 사업 동향, 실적을 알려줘.",
            "hiring": f"{company_name}의 채용 트렌드, 면접 특징, 자소서 합격 전략을 알려줘.",
        }
        tasks = {
            key: _search_perplexity_custom(query, api_key)
            for key, query in perplexity_queries.items()
        }
        gathered = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for key, result in zip(tasks.keys(), gathered):
            results[key] = result if isinstance(result, list) else []
    elif provider == "serper":
        import asyncio
        tasks = {key: _search_serper(query, max_results=3) for key, query in queries.items()}
        gathered = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for key, result in zip(tasks.keys(), gathered):
            results[key] = result if isinstance(result, list) else []

    else:
        results = {"culture": [], "news": [], "hiring": []}

    return results


# ── Tavily ──


async def _search_tavily(
    query: str, max_results: int = 5,
) -> list[dict]:
    """Search using Tavily AI Search API with multi-key rotation on rate limit."""
    global _tavily_key_index
    settings = load_app_settings()
    keys = [k for k in settings.llm.search.tavily_keys if k.api_key and not k.disabled]

    if not keys:
        return []

    url = "https://api.tavily.com/search"

    for attempt in range(len(keys)):
        idx = (_tavily_key_index + attempt) % len(keys)
        key_entry = keys[idx]

        payload = {
            "api_key": key_entry.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "advanced",
            "include_answer": True,
        }

        async with httpx.AsyncClient(timeout=20) as client:
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 429:
                    continue
                resp.raise_for_status()
            except httpx.HTTPError:
                continue

        _tavily_key_index = idx

        data = resp.json()
        results = []
        if data.get("answer"):
            results.append({
                "title": "AI 요약",
                "description": data["answer"],
                "url": "",
            })
        for item in data.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "description": item.get("content", ""),
                "url": item.get("url", ""),
            })
        return results[:max_results]

    return []


# ── Perplexity ──


async def _search_perplexity(
    company_name: str, api_key: str, max_results: int,
) -> list[dict]:
    """Search using Perplexity Sonar API (legacy single query)."""
    query = f"{company_name}의 기업 정보, 인재상, 최근 뉴스, 채용 동향을 알려줘."
    return await _search_perplexity_custom(query, api_key, max_results)


async def _search_perplexity_custom(
    query: str, api_key: str, max_results: int = 5,
) -> list[dict]:
    """Search using Perplexity Sonar API with custom query."""
    if not api_key:
        return []

    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "sonar",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a company research assistant. "
                    "Provide structured, factual information in Korean. "
                    "Focus on specifics — numbers, names, dates — not generalities."
                ),
            },
            {"role": "user", "content": query},
        ],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
        except httpx.HTTPError:
            return []

    data = resp.json()
    results = []
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if content:
        results.append({
            "title": "Perplexity 리서치",
            "description": content,
            "url": "",
        })
    citations = data.get("citations", [])
    for i, cite_url in enumerate(citations[:max_results - 1]):
        results.append({
            "title": f"출처 {i + 1}",
            "description": "",
            "url": cite_url,
        })
    return results[:max_results]


# ── Serper (Google SERP) ──


async def _search_serper(query: str, max_results: int = 5) -> list[dict]:
    """Search using Serper.dev Google SERP API."""
    settings = load_app_settings()
    api_key = settings.llm.search.serper_api_key
    if not api_key:
        return []

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
                json={"q": query, "gl": "kr", "hl": "ko", "num": max_results},
            )
            resp.raise_for_status()
        except httpx.HTTPError:
            return []

    data = resp.json()
    results = []

    kg = data.get("knowledgeGraph")
    if kg:
        results.append({
            "title": kg.get("title", ""),
            "description": kg.get("description", ""),
            "url": kg.get("website", ""),
        })

    for item in data.get("organic", [])[:max_results]:
        results.append({
            "title": item.get("title", ""),
            "description": item.get("snippet", ""),
            "url": item.get("link", ""),
        })

    return results[:max_results]
