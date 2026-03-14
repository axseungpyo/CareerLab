"""Embedding engine — OpenAI text-embedding-3-small + Supabase pgvector search."""

from openai import AsyncOpenAI
from supabase import create_client

from config.settings import get_settings
from core.llm_router import _get_openai_client

MAX_TEXT_LENGTH = 2000
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


class EmbeddingEngine:
    """Generate embeddings and perform semantic search via pgvector."""

    def __init__(self):
        settings = get_settings()
        self._supabase = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    def _get_client(self) -> AsyncOpenAI:
        """Get OpenAI client respecting OAuth/API key settings."""
        return _get_openai_client()

    async def embed_text(self, text: str) -> list[float]:
        """Generate 1536-dim embedding for text (truncated to 2000 chars)."""
        truncated = text[:MAX_TEXT_LENGTH]
        client = self._get_client()
        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=truncated,
        )
        return response.data[0].embedding

    async def embed_and_store(self, text: str, entry_id: str) -> list[float]:
        """Generate embedding and update career_entries.embedding."""
        vector = await self.embed_text(text)
        self._supabase.table("career_entries").update(
            {"embedding": vector}
        ).eq("id", entry_id).execute()
        return vector

    async def semantic_search(
        self,
        query: str,
        profile_id: str,
        threshold: float = 0.7,
        limit: int = 5,
    ) -> list[dict]:
        """Search career entries by cosine similarity via match_career_entries RPC."""
        query_embedding = await self.embed_text(query)
        result = self._supabase.rpc(
            "match_career_entries",
            {
                "query_embedding": query_embedding,
                "match_threshold": threshold,
                "match_count": limit,
                "filter_profile_id": profile_id,
            },
        ).execute()
        return result.data or []


# Singleton
_engine: EmbeddingEngine | None = None


def get_embedding_engine() -> EmbeddingEngine:
    global _engine
    if _engine is None:
        _engine = EmbeddingEngine()
    return _engine
