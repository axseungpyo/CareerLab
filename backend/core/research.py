"""Web search integration for company research.

Supports Tavily (AI-native, multi-key with auto-rotation) and Perplexity Sonar (search+summary).
Provider is selected via runtime settings (search_provider field).
"""

import httpx

from core.app_settings import load_app_settings


# Track which Tavily key index to try next (in-memory, resets on restart)
_tavily_key_index: int = 0


async def search_company(company_name: str, max_results: int = 5) -> list[dict]:
    """Search for company information using the configured search provider."""
    settings = load_app_settings()
    search = settings.llm.search

    if not search.enabled:
        return []

    provider = search.provider
    if provider == "tavily":
        return await _search_tavily(company_name, max_results)
    elif provider == "perplexity":
        return await _search_perplexity(company_name, search.perplexity_api_key, max_results)

    return []


async def _search_tavily(
    company_name: str, max_results: int,
) -> list[dict]:
    """Search using Tavily AI Search API with multi-key rotation on rate limit."""
    global _tavily_key_index
    settings = load_app_settings()
    keys = [k for k in settings.llm.search.tavily_keys if k.api_key and not k.disabled]

    if not keys:
        return []

    url = "https://api.tavily.com/search"

    # Try each key starting from _tavily_key_index
    for attempt in range(len(keys)):
        idx = (_tavily_key_index + attempt) % len(keys)
        key_entry = keys[idx]

        payload = {
            "api_key": key_entry.api_key,
            "query": f"{company_name} 기업정보 채용 인재상 최근 뉴스",
            "max_results": max_results,
            "search_depth": "advanced",
            "include_answer": True,
        }

        async with httpx.AsyncClient(timeout=20) as client:
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 429:
                    # Rate limited — rotate to next key
                    continue
                resp.raise_for_status()
            except httpx.HTTPError:
                continue

        # Success — update index for next call
        _tavily_key_index = idx

        data = resp.json()
        results = []
        if data.get("answer"):
            results.append({
                "title": f"{company_name} — AI 요약",
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

    # All keys exhausted
    return []


async def _search_perplexity(
    company_name: str, api_key: str, max_results: int,
) -> list[dict]:
    """Search using Perplexity Sonar API (chat completions with web search)."""
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
                    "Provide structured information about the company in Korean. "
                    "Include: company overview, recent news, hiring culture, key values, and industry position."
                ),
            },
            {
                "role": "user",
                "content": f"{company_name}의 기업 정보, 인재상, 최근 뉴스, 채용 동향을 알려줘.",
            },
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
            "title": f"{company_name} — Perplexity 리서치",
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
