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
        data.company_name, data.job_posting_text, data.job_posting_url
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
