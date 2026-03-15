"""Profile API routes — CRUD for profiles and career entries + file/Notion import."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

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


# ── File Upload (expanded: PDF, DOCX, TXT, MD) ──

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """Upload resume file for parsing. Supports PDF, DOCX, TXT, MD."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일이 없습니다.")

    ext = file.filename.rsplit(".", 1)[-1].lower()

    from modules.profile.connectors.file import FileConnector
    if ext not in FileConnector.SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 지원: {', '.join(sorted(FileConnector.SUPPORTED_EXTENSIONS))}",
        )

    content = await file.read()
    connector = FileConnector()
    return await connector.parse((content, ext))


# ── Notion Import ──

@router.get("/import/notion/pages")
async def list_notion_pages(query: str = ""):
    """Search Notion workspace for pages."""
    from core.app_settings import load_app_settings
    settings = load_app_settings()

    if not settings.llm.notion.enabled or not settings.llm.notion.api_key:
        raise HTTPException(
            status_code=400,
            detail="Notion API Key가 설정되지 않았습니다. /settings에서 설정하세요.",
        )

    from modules.profile.connectors.notion import NotionConnector
    connector = NotionConnector(settings.llm.notion.api_key)

    try:
        return await connector.list_pages(query)
    except Exception as e:
        _raise_notion_error(e)


class NotionImportRequest(BaseModel):
    page_id: str


@router.post("/import/notion")
async def import_notion_page(req: NotionImportRequest):
    """Import a Notion page and parse into profile + career entries."""
    from core.app_settings import load_app_settings
    settings = load_app_settings()

    if not settings.llm.notion.enabled or not settings.llm.notion.api_key:
        raise HTTPException(
            status_code=400,
            detail="Notion API Key가 설정되지 않았습니다. /settings에서 설정하세요.",
        )

    from modules.profile.connectors.notion import NotionConnector
    connector = NotionConnector(settings.llm.notion.api_key)

    try:
        return await connector.parse(req.page_id)
    except Exception as e:
        _raise_notion_error(e)


def _raise_notion_error(e: Exception) -> None:
    """Convert Notion API errors to appropriate HTTP exceptions."""
    import httpx
    error_msg = str(e)
    if isinstance(e, httpx.TimeoutException):
        raise HTTPException(status_code=408, detail="Notion 서버 응답 시간 초과. 잠시 후 다시 시도하세요.")
    if "401" in error_msg:
        raise HTTPException(status_code=400, detail="Notion API Key가 유효하지 않습니다.")
    if "403" in error_msg:
        raise HTTPException(status_code=400, detail="페이지에 Integration을 연결(Connection)하세요.")
    if "404" in error_msg:
        raise HTTPException(status_code=404, detail="Notion 페이지를 찾을 수 없습니다.")
    raise HTTPException(status_code=500, detail=f"Notion API 오류: {error_msg}")
