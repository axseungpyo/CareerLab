"""Profile service — business logic combining repository + embedding."""

from modules.profile.models import (
    ProfileCreate,
    ProfileUpdate,
    CareerEntryCreate,
    CareerEntryUpdate,
)
from modules.profile.repository import ProfileRepository
from core.embedding import get_embedding_engine


class ProfileService:
    """Profile business logic with automatic embedding on career entry creation."""

    def __init__(self, repo: ProfileRepository | None = None):
        self._repo = repo or ProfileRepository()
        self._embedding = get_embedding_engine()

    # ── Profile ──

    def create_profile(self, data: ProfileCreate) -> dict:
        return self._repo.create_profile(data)

    def get_profile(self, profile_id: str) -> dict | None:
        return self._repo.get_profile(profile_id)

    def get_first_profile(self) -> dict | None:
        return self._repo.get_first_profile()

    def update_profile(self, profile_id: str, data: ProfileUpdate) -> dict:
        return self._repo.update_profile(profile_id, data)

    def delete_profile(self, profile_id: str) -> None:
        self._repo.delete_profile(profile_id)

    # ── Career Entries ──

    async def add_career_entry(self, data: CareerEntryCreate) -> dict:
        """Create career entry and auto-embed its content."""
        entry = self._repo.create_career_entry(data)

        # Build text for embedding: content + STAR
        parts = [data.content]
        for field in [data.star_situation, data.star_task, data.star_action, data.star_result]:
            if field:
                parts.append(field)
        embed_text = "\n".join(parts)

        await self._embedding.embed_and_store(embed_text, entry["id"])
        return entry

    def get_career_entries(self, profile_id: str) -> list[dict]:
        return self._repo.get_career_entries(profile_id)

    def update_career_entry(self, entry_id: str, data: CareerEntryUpdate) -> dict:
        return self._repo.update_career_entry(entry_id, data)

    def delete_career_entry(self, entry_id: str) -> None:
        self._repo.delete_career_entry(entry_id)
