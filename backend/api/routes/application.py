"""Application API routes — CRUD + stage management + URL parsing + calendar."""

from fastapi import APIRouter, HTTPException

from modules.application.models import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    StageUpdate,
    UrlParseRequest,
    UrlParseResponse,
)
from modules.application.service import ApplicationService

router = APIRouter()

VALID_STAGES = {"interested", "applied", "interview", "result"}
VALID_RESULTS = {"pass", "fail", "pending"}


def _get_service() -> ApplicationService:
    return ApplicationService()


# ── CRUD ──

@router.get("", response_model=list[ApplicationResponse])
async def list_applications(profile_id: str | None = None):
    svc = _get_service()
    if not profile_id:
        # Get first profile
        from modules.profile.service import ProfileService
        p = ProfileService().get_first_profile()
        if not p:
            return []
        profile_id = p["id"]
    return svc.get_all(profile_id)


@router.get("/calendar")
async def get_calendar(profile_id: str | None = None):
    svc = _get_service()
    if not profile_id:
        from modules.profile.service import ProfileService
        p = ProfileService().get_first_profile()
        if not p:
            return []
        profile_id = p["id"]
    return svc.get_calendar_events(profile_id)


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: str):
    svc = _get_service()
    result = svc.get(app_id)
    if not result:
        raise HTTPException(status_code=404, detail="지원 정보를 찾을 수 없습니다.")
    return result


@router.post("", response_model=ApplicationResponse, status_code=201)
async def create_application(data: ApplicationCreate):
    if data.stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail="유효하지 않은 단계입니다.")
    svc = _get_service()
    return svc.create(data.model_dump(exclude_none=True))


@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(app_id: str, data: ApplicationUpdate):
    svc = _get_service()
    existing = svc.get(app_id)
    if not existing:
        raise HTTPException(status_code=404, detail="지원 정보를 찾을 수 없습니다.")
    return svc.update(app_id, data.model_dump(exclude_none=True))


@router.patch("/{app_id}/stage", response_model=ApplicationResponse)
async def update_stage(app_id: str, data: StageUpdate):
    if data.stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail="유효하지 않은 단계입니다.")
    if data.result and data.result not in VALID_RESULTS:
        raise HTTPException(status_code=400, detail="유효하지 않은 결과입니다.")
    svc = _get_service()
    existing = svc.get(app_id)
    if not existing:
        raise HTTPException(status_code=404, detail="지원 정보를 찾을 수 없습니다.")
    return svc.update_stage(app_id, data.stage, data.result)


@router.delete("/{app_id}", status_code=204)
async def delete_application(app_id: str):
    svc = _get_service()
    svc.delete(app_id)


# ── URL Parsing ──

@router.post("/parse-url", response_model=UrlParseResponse)
async def parse_url(data: UrlParseRequest):
    """Parse job posting URL to extract company info."""
    svc = _get_service()
    result = await svc.parse_url(data.url)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
