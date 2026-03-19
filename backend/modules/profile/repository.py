"""Profile repository — Supabase CRUD for profiles, career_entries, courses, language_tests, certifications, awards."""

from supabase import create_client, Client

from config.settings import get_settings
from modules.profile.models import (
    ProfileCreate,
    ProfileUpdate,
    CareerEntryCreate,
    CareerEntryUpdate,
    CourseCreate,
    LanguageTestCreate,
    CertificationCreate,
    AwardCreate,
)


class ProfileRepository:
    """Data access layer for profiles and related tables."""

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
        if "military_service" in payload and hasattr(payload["military_service"], "model_dump"):
            payload["military_service"] = payload["military_service"].model_dump(exclude_none=True)
        # Map name_hanja → address DB column
        if "name_hanja" in payload:
            payload["address"] = payload.pop("name_hanja")
        result = self._db.table("profiles").insert(payload).execute()
        return self._map_profile(result.data[0])

    @staticmethod
    def _map_profile(row: dict) -> dict:
        """Map DB column 'address' → API field 'name_hanja'."""
        if "address" in row:
            row["name_hanja"] = row.pop("address")
        return row

    def get_profile(self, profile_id: str) -> dict | None:
        result = self._db.table("profiles").select("*").eq("id", profile_id).execute()
        return self._map_profile(result.data[0]) if result.data else None

    def get_first_profile(self) -> dict | None:
        result = (
            self._db.table("profiles")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return self._map_profile(result.data[0]) if result.data else None

    def update_profile(self, profile_id: str, data: ProfileUpdate) -> dict:
        payload = data.model_dump(exclude_none=True)
        if "military_service" in payload and hasattr(payload["military_service"], "model_dump"):
            payload["military_service"] = payload["military_service"].model_dump(exclude_none=True)
        # Map name_hanja → address DB column
        if "name_hanja" in payload:
            payload["address"] = payload.pop("name_hanja")
        result = (
            self._db.table("profiles")
            .update(payload)
            .eq("id", profile_id)
            .execute()
        )
        return self._map_profile(result.data[0])

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

    # ── Courses (이수교과목) ──

    def get_courses(self, profile_id: str) -> list[dict]:
        result = (
            self._db.table("courses")
            .select("*")
            .eq("profile_id", profile_id)
            .order("year", desc=True)
            .order("semester")
            .execute()
        )
        return result.data

    def create_course(self, data: CourseCreate) -> dict:
        payload = data.model_dump(exclude_none=True)
        result = self._db.table("courses").insert(payload).execute()
        return result.data[0]

    def delete_course(self, course_id: str) -> None:
        self._db.table("courses").delete().eq("id", course_id).execute()

    # ── Language Tests (외국어) ──

    def get_language_tests(self, profile_id: str) -> list[dict]:
        result = (
            self._db.table("language_tests")
            .select("*")
            .eq("profile_id", profile_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    def create_language_test(self, data: LanguageTestCreate) -> dict:
        payload = data.model_dump(exclude_none=True)
        result = self._db.table("language_tests").insert(payload).execute()
        return result.data[0]

    def delete_language_test(self, test_id: str) -> None:
        self._db.table("language_tests").delete().eq("id", test_id).execute()

    # ── Certifications (자격증) ──

    def get_certifications(self, profile_id: str) -> list[dict]:
        result = (
            self._db.table("certifications")
            .select("*")
            .eq("profile_id", profile_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    def create_certification(self, data: CertificationCreate) -> dict:
        payload = data.model_dump(exclude_none=True)
        result = self._db.table("certifications").insert(payload).execute()
        return result.data[0]

    def delete_certification(self, cert_id: str) -> None:
        self._db.table("certifications").delete().eq("id", cert_id).execute()

    # ── Awards (수상경력) ──

    def get_awards(self, profile_id: str) -> list[dict]:
        result = (
            self._db.table("awards")
            .select("*")
            .eq("profile_id", profile_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    def create_award(self, data: AwardCreate) -> dict:
        payload = data.model_dump(exclude_none=True)
        result = self._db.table("awards").insert(payload).execute()
        return result.data[0]

    def delete_award(self, award_id: str) -> None:
        self._db.table("awards").delete().eq("id", award_id).execute()
