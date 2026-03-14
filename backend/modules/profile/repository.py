"""Profile repository — Supabase CRUD for profiles and career_entries."""

from supabase import create_client, Client

from config.settings import get_settings
from modules.profile.models import (
    ProfileCreate,
    ProfileUpdate,
    CareerEntryCreate,
    CareerEntryUpdate,
)


class ProfileRepository:
    """Data access layer for profiles and career entries."""

    def __init__(self, client: Client | None = None):
        if client:
            self._db = client
        else:
            settings = get_settings()
            self._db = create_client(
                settings.supabase_url, settings.supabase_service_role_key
            )

    # ── Profiles ──

    def create_profile(self, data: ProfileCreate) -> dict:
        payload = data.model_dump(exclude_none=True)
        if "education" in payload:
            payload["education"] = [e if isinstance(e, dict) else e for e in payload["education"]]
        result = self._db.table("profiles").insert(payload).execute()
        return result.data[0]

    def get_profile(self, profile_id: str) -> dict | None:
        result = self._db.table("profiles").select("*").eq("id", profile_id).execute()
        return result.data[0] if result.data else None

    def get_first_profile(self) -> dict | None:
        result = (
            self._db.table("profiles")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    def update_profile(self, profile_id: str, data: ProfileUpdate) -> dict:
        payload = data.model_dump(exclude_none=True)
        result = (
            self._db.table("profiles")
            .update(payload)
            .eq("id", profile_id)
            .execute()
        )
        return result.data[0]

    def delete_profile(self, profile_id: str) -> None:
        self._db.table("profiles").delete().eq("id", profile_id).execute()

    # ── Career Entries ──

    def create_career_entry(self, data: CareerEntryCreate) -> dict:
        payload = data.model_dump(exclude_none=True)
        result = self._db.table("career_entries").insert(payload).execute()
        return result.data[0]

    def get_career_entries(self, profile_id: str) -> list[dict]:
        result = (
            self._db.table("career_entries")
            .select("*")
            .eq("profile_id", profile_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    def get_career_entry(self, entry_id: str) -> dict | None:
        result = (
            self._db.table("career_entries")
            .select("*")
            .eq("id", entry_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def update_career_entry(self, entry_id: str, data: CareerEntryUpdate) -> dict:
        payload = data.model_dump(exclude_none=True)
        result = (
            self._db.table("career_entries")
            .update(payload)
            .eq("id", entry_id)
            .execute()
        )
        return result.data[0]

    def delete_career_entry(self, entry_id: str) -> None:
        self._db.table("career_entries").delete().eq("id", entry_id).execute()
