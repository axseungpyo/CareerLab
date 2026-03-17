from fastapi import APIRouter, HTTPException
from supabase import create_client
from modules.resume.models import EssayQuestionResponse, EssayQuestionCreate
from config.settings import get_effective_supabase

router = APIRouter(prefix="/api/essay-questions", tags=["essay-questions"])

def _get_db():
    url, key = get_effective_supabase()
    return create_client(url, key)

@router.get("", response_model=list[EssayQuestionResponse])
async def get_essay_questions(company: str | None = None):
    """Get essay questions, optionally filtered by company name."""
    sb = _get_db()
    query = sb.table("essay_questions").select("*").order("question_number")
    if company:
        query = query.eq("company_name", company)
    result = query.execute()
    return result.data

@router.get("/companies")
async def get_companies_with_questions():
    """Get list of company names that have essay questions."""
    sb = _get_db()
    result = sb.table("essay_questions").select("company_name").execute()
    companies = sorted(set(r["company_name"] for r in result.data))
    return companies

@router.post("", response_model=EssayQuestionResponse, status_code=201)
async def create_essay_question(data: EssayQuestionCreate):
    """Create a new essay question."""
    sb = _get_db()
    result = sb.table("essay_questions").insert(data.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="기출문항 추가에 실패했습니다.")
    return result.data[0]

@router.delete("/{question_id}")
async def delete_essay_question(question_id: str):
    """Delete an essay question."""
    sb = _get_db()
    result = sb.table("essay_questions").delete().eq("id", question_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="기출문항을 찾을 수 없습니다.")
    return {"success": True}
