"""Brave Search API integration for company research."""

import httpx

from config.settings import get_settings

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"


async def search_company(company_name: str, max_results: int = 5) -> list[dict]:
    """Search for company information using Brave Search API."""
    settings = get_settings()
    if not settings.brave_api_key:
        return []

    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": settings.brave_api_key,
    }
    params = {
        "q": f"{company_name} 기업정보 채용 인재상",
        "count": max_results,
        "search_lang": "ko",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(BRAVE_SEARCH_URL, headers=headers, params=params)
            resp.raise_for_status()
        except httpx.HTTPError:
            return []

    data = resp.json()
    results = []
    for item in data.get("web", {}).get("results", []):
        results.append({
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "url": item.get("url", ""),
        })
    return results
