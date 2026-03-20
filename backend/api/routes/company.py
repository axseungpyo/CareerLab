"""Company Analysis API routes — standalone hub for company analysis management."""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from modules.resume.models import CompanyAnalysisCreate, CompanyAnalysisResponse
from modules.resume.analyzer import CompanyAnalyzer


def _validate_uuid(value: str) -> str:
    try:
        UUID(value)
        return value
    except ValueError:
        raise HTTPException(status_code=400, detail="유효하지 않은 ID 형식입니다.")

router = APIRouter()


@router.post("/analyze", response_model=CompanyAnalysisResponse)
async def analyze_company(data: CompanyAnalysisCreate):
    """Run company analysis (GPT-4o-mini + web search)."""
    analyzer = CompanyAnalyzer()
    return await analyzer.analyze(
        data.company_name, data.job_posting_text, data.job_posting_url,
        web_search=data.web_search,
    )


@router.get("", response_model=list[CompanyAnalysisResponse])
async def list_analyses():
    """List all company analyses."""
    analyzer = CompanyAnalyzer()
    return analyzer.get_analyses()


@router.get("/{analysis_id}", response_model=CompanyAnalysisResponse)
async def get_analysis(analysis_id: str):
    """Get a single company analysis."""
    _validate_uuid(analysis_id)
    analyzer = CompanyAnalyzer()
    result = analyzer.get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="기업 분석을 찾을 수 없습니다.")
    return result


@router.put("/{analysis_id}", response_model=CompanyAnalysisResponse)
async def update_analysis(analysis_id: str, data: dict):
    """Partial update of analysis fields (keywords, requirements, etc.)."""
    _validate_uuid(analysis_id)
    allowed = {"keywords", "requirements", "talent_profile", "research_notes"}
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="업데이트할 필드가 없습니다.")
    analyzer = CompanyAnalyzer()
    analyzer._db.table("company_analyses").update(update_data).eq("id", analysis_id).execute()
    result = analyzer.get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="기업 분석을 찾을 수 없습니다.")
    return result


@router.post("/parse-url")
async def parse_job_posting_url(data: dict):
    """Fetch and extract text from a job posting URL."""
    import httpx
    from bs4 import BeautifulSoup

    url = data.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL을 입력하세요.")

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            })
            resp.raise_for_status()
    except Exception:
        raise HTTPException(status_code=422, detail="URL에 접근할 수 없습니다. 채용공고를 직접 붙여넣어 주세요.")

    soup = BeautifulSoup(resp.text, "html.parser")
    # Remove scripts, styles, nav, footer
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Clean up excessive newlines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned = "\n".join(lines)

    if len(cleaned) < 50:
        raise HTTPException(status_code=422, detail="채용공고 텍스트를 추출할 수 없습니다. 로그인이 필요한 페이지일 수 있습니다.")

    return {"text": cleaned[:10000]}  # 최대 10000자


@router.delete("/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: str):
    """Delete a company analysis (checks FK references first)."""
    _validate_uuid(analysis_id)
    analyzer = CompanyAnalyzer()
    existing = analyzer.get_analysis(analysis_id)
    if not existing:
        raise HTTPException(status_code=404, detail="기업 분석을 찾을 수 없습니다.")
    try:
        analyzer.delete_analysis(analysis_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
