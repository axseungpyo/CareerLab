"""Application repository — Supabase CRUD for job applications."""

from supabase import create_client
from config.settings import get_effective_supabase


class ApplicationRepository:
    """Supabase CRUD for applications table."""

    def __init__(self):
        url, key = get_effective_supabase()
        self._db = create_client(url, key)

    def create(self, data: dict) -> dict:
        result = self._db.table("applications").insert(data).execute()
        return result.data[0]

    def get(self, app_id: str) -> dict | None:
        result = (
            self._db.table("applications")
            .select("*")
            .eq("id", app_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_all(self, profile_id: str) -> list[dict]:
        result = (
            self._db.table("applications")
            .select("*")
            .eq("profile_id", profile_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return result.data

    def update(self, app_id: str, data: dict) -> dict:
        data["updated_at"] = "now()"
        result = (
            self._db.table("applications")
            .update(data)
            .eq("id", app_id)
            .execute()
        )
        return result.data[0]

    def update_stage(self, app_id: str, stage: str, result: str | None = None) -> dict:
        payload: dict = {"stage": stage, "updated_at": "now()"}
        if result is not None:
            payload["result"] = result
        res = (
            self._db.table("applications")
            .update(payload)
            .eq("id", app_id)
            .execute()
        )
        return res.data[0]

    def delete(self, app_id: str) -> None:
        self._db.table("applications").delete().eq("id", app_id).execute()

    def get_calendar_events(self, profile_id: str) -> list[dict]:
        """Get deadline + interview events for calendar view."""
        apps = self.get_all(profile_id)
        events = []
        for app in apps:
            if app.get("deadline"):
                events.append({
                    "id": app["id"],
                    "company_name": app["company_name"],
                    "type": "deadline",
                    "date": app["deadline"],
                    "stage": app["stage"],
                })
            if app.get("interview_date"):
                events.append({
                    "id": app["id"],
                    "company_name": app["company_name"],
                    "type": "interview",
                    "date": app["interview_date"],
                    "stage": app["stage"],
                })
        return sorted(events, key=lambda e: e["date"])
