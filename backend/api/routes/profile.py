"""Profile API routes — CRUD for profiles and career entries + file upload."""

from fastapi import APIRouter, HTTPException, UploadFile, File

from modules.profile.models import (
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse,
    CareerEntryCreate,
    CareerEntryResponse,
)
from modules.profile.service import ProfileService

router = APIRouter()


def _get_service() -> ProfileService:
    return ProfileService()


# ── Profile CRUD ──

@router.get("", response_model=ProfileResponse | None)
async def get_profile():
    """Get the first (primary) profile."""
    svc = _get_service()
    profile = svc.get_first_profile()
    if not profile:
        return None
    return profile


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile_by_id(profile_id: str):
    svc = _get_service()
    profile = svc.get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다.")
    return profile


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_profile(data: ProfileCreate):
    svc = _get_service()
    return svc.create_profile(data)


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(profile_id: str, data: ProfileUpdate):
    svc = _get_service()
    return svc.update_profile(profile_id, data)


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: str):
    svc = _get_service()
    svc.delete_profile(profile_id)


# ── Career Entries ──

@router.get("/entries/{profile_id}", response_model=list[CareerEntryResponse])
async def get_career_entries(profile_id: str):
    svc = _get_service()
    return svc.get_career_entries(profile_id)


@router.post("/entries", response_model=CareerEntryResponse, status_code=201)
async def create_career_entry(data: CareerEntryCreate):
    svc = _get_service()
    return await svc.add_career_entry(data)


@router.delete("/entries/{entry_id}", status_code=204)
async def delete_career_entry(entry_id: str):
    svc = _get_service()
    svc.delete_career_entry(entry_id)


# ── File Upload ──

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """Upload PDF/DOCX resume for parsing."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일이 없습니다.")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "docx"):
        raise HTTPException(
            status_code=400, detail="PDF 또는 DOCX 파일만 지원합니다."
        )

    content = await file.read()

    from modules.profile.parser import ResumeParser
    parser = ResumeParser()
    result = await parser.parse(content, ext)
    return result
