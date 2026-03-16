"""Application service — thin wrapper over repository."""

from modules.application.repository import ApplicationRepository
from modules.application.url_parser import JobUrlParser


class ApplicationService:
    """Business logic for job application tracking."""

    def __init__(self):
        self._repo = ApplicationRepository()
        self._parser = JobUrlParser()

    def create(self, data: dict) -> dict:
        return self._repo.create(data)

    def get(self, app_id: str) -> dict | None:
        return self._repo.get(app_id)

    def get_all(self, profile_id: str) -> list[dict]:
        return self._repo.get_all(profile_id)

    def update(self, app_id: str, data: dict) -> dict:
        return self._repo.update(app_id, data)

    def update_stage(self, app_id: str, stage: str, result: str | None = None) -> dict:
        return self._repo.update_stage(app_id, stage, result)

    def delete(self, app_id: str) -> None:
        self._repo.delete(app_id)

    def get_calendar_events(self, profile_id: str) -> list[dict]:
        return self._repo.get_calendar_events(profile_id)

    async def parse_url(self, url: str) -> dict:
        return await self._parser.parse(url)
