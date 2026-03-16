"""Job URL parser — extract job posting info from URL using Tavily + GPT."""

import json
import httpx

from core.app_settings import load_app_settings
from core.llm_router import call_llm, TaskType

PARSE_URL_PROMPT = """다음 채용공고 내용에서 정보를 추출하세요.
반드시 JSON으로 응답:
{
  "company_name": "기업명",
  "job_title": "채용 직무/포지션",
  "deadline": "마감일 (YYYY-MM-DD, 없으면 null)",
  "requirements": ["자격요건1", "자격요건2"],
  "keywords": ["핵심키워드1", "핵심키워드2"]
}"""


class JobUrlParser:
    """Parse job posting URL → structured data using Tavily + GPT."""

    async def parse(self, url: str) -> dict:
        """Fetch URL content via Tavily, then structure via GPT."""
        raw_text = await self._fetch_content(url)
        if not raw_text:
            return {"error": "공고 내용을 가져올 수 없습니다.", "raw_text": None}

        messages = [
            {"role": "system", "content": PARSE_URL_PROMPT},
            {"role": "user", "content": raw_text[:6000]},
        ]
        result = await call_llm(messages, TaskType.company_analysis, json_mode=True)
        try:
            parsed = json.loads(result)
            parsed["raw_text"] = raw_text[:2000]
            return parsed
        except json.JSONDecodeError:
            return {"error": "공고 파싱에 실패했습니다.", "raw_text": raw_text[:2000]}

    async def _fetch_content(self, url: str) -> str | None:
        """Fetch page content using Tavily search API."""
        settings = load_app_settings()
        tavily_keys = [k for k in settings.llm.search.tavily_keys if k.api_key and not k.disabled]

        if not tavily_keys:
            return await self._fetch_direct(url)

        api_url = "https://api.tavily.com/search"
        for key_entry in tavily_keys:
            payload = {
                "api_key": key_entry.api_key,
                "query": url,
                "max_results": 1,
                "search_depth": "advanced",
                "include_raw_content": True,
            }
            async with httpx.AsyncClient(timeout=20) as client:
                try:
                    resp = await client.post(api_url, json=payload)
                    if resp.status_code == 429:
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    results = data.get("results", [])
                    if results:
                        return results[0].get("raw_content") or results[0].get("content", "")
                except httpx.HTTPError:
                    continue
        return await self._fetch_direct(url)

    async def _fetch_direct(self, url: str) -> str | None:
        """Fallback: fetch URL directly."""
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            try:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                resp.raise_for_status()
                # Extract text from HTML (simple)
                text = resp.text
                # Remove HTML tags roughly
                import re
                text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
                text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
                text = re.sub(r"<[^>]+>", " ", text)
                text = re.sub(r"\s+", " ", text).strip()
                return text[:8000] if text else None
            except Exception:
                return None
