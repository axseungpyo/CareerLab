"""NotionConnector — fetch and parse Notion pages via Notion API."""

import httpx
from typing import Any

from .base import DataConnector

NOTION_API_VERSION = "2022-06-28"


class NotionConnector(DataConnector):
    """Fetch Notion pages and parse into structured profile data."""

    def __init__(self, api_key: str):
        self._api_key = api_key
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Notion-Version": NOTION_API_VERSION,
            "Content-Type": "application/json",
        }

    @property
    def source_type(self) -> str:
        return "notion"

    async def list_pages(self, query: str = "") -> list[dict]:
        """Search Notion workspace for pages."""
        url = "https://api.notion.com/v1/search"
        payload: dict = {
            "filter": {"property": "object", "value": "page"},
            "page_size": 20,
        }
        if query:
            payload["query"] = query

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, headers=self._headers, json=payload)
            resp.raise_for_status()

        pages = []
        for item in resp.json().get("results", []):
            title = self._extract_title(item)
            pages.append({
                "id": item["id"],
                "title": title or "(제목 없음)",
                "url": item.get("url", ""),
                "icon": self._extract_icon(item),
                "last_edited": item.get("last_edited_time", ""),
            })
        return pages

    async def extract_text(self, source: Any) -> str:
        """Fetch all blocks from a Notion page → plain text.
        source = page_id (string)
        """
        page_id = source
        all_texts: list[str] = []
        cursor: str | None = None

        while True:
            url = f"https://api.notion.com/v1/blocks/{page_id}/children"
            params: dict = {"page_size": 100}
            if cursor:
                params["start_cursor"] = cursor

            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, headers=self._headers, params=params)
                resp.raise_for_status()

            data = resp.json()
            for block in data.get("results", []):
                text = self._block_to_text(block)
                if text:
                    all_texts.append(text)

            if data.get("has_more"):
                cursor = data.get("next_cursor")
            else:
                break

        return "\n".join(all_texts)

    def _block_to_text(self, block: dict) -> str:
        """Extract plain text from a Notion block with type-aware formatting."""
        block_type = block.get("type", "")
        block_data = block.get(block_type, {})
        rich_texts = block_data.get("rich_text", [])
        text = "".join(rt.get("plain_text", "") for rt in rich_texts)

        if block_type == "heading_1":
            return f"# {text}"
        elif block_type == "heading_2":
            return f"## {text}"
        elif block_type == "heading_3":
            return f"### {text}"
        elif block_type == "bulleted_list_item":
            return f"- {text}"
        elif block_type == "numbered_list_item":
            return f"1. {text}"
        elif block_type == "to_do":
            checked = block_data.get("checked", False)
            return f"[{'x' if checked else ' '}] {text}"
        elif block_type == "divider":
            return "---"
        return text

    def _extract_title(self, page: dict) -> str:
        for prop in page.get("properties", {}).values():
            if prop.get("type") == "title":
                return "".join(
                    t.get("plain_text", "") for t in prop.get("title", [])
                )
        return ""

    def _extract_icon(self, page: dict) -> str | None:
        icon = page.get("icon")
        if icon and icon.get("type") == "emoji":
            return icon.get("emoji")
        return None
