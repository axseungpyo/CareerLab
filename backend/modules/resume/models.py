"""Resume & CompanyAnalysis Pydantic models."""

from pydantic import BaseModel


class CompanyAnalysisCreate(BaseModel):
    company_name: str
    job_posting_text: str
    job_posting_url: str | None = None
    research_notes: str | None = None


class CompanyAnalysisResponse(BaseModel):
    id: str
    company_name: str
    job_posting_text: str | None = None
    job_posting_url: str | None = None
    requirements: list | None = None
    talent_profile: dict | None = None
    keywords: list[str] | None = None
    company_info: dict | None = None
    research_notes: str | None = None
    analyzed_at: str


class ResumeCreate(BaseModel):
    profile_id: str
    company_analysis_id: str
    title: str


class ResumeResponse(BaseModel):
    id: str
    profile_id: str
    company_analysis_id: str
    title: str
    status: str
    result: str | None = None
    submitted_at: str | None = None
    created_at: str


class ResumeItemCreate(BaseModel):
    resume_id: str
    question: str
    answer: str
    char_limit: int | None = None
    tone: str | None = None
    matched_entries: list[str] | None = None


class ResumeItemResponse(BaseModel):
    id: str
    resume_id: str
    question: str
    answer: str
    char_limit: int | None = None
    tone: str | None = None
    version: int
    matched_entries: list[str] | None = None
    created_at: str


class ResumeItemUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    tone: str | None = None
    version: int | None = None


class GenerateRequest(BaseModel):
    profile_id: str
    company_analysis_id: str
    question: str
    char_limit: int | None = None
    tone: str | None = "전문적"
    emphasis: str | None = None


class StatusUpdate(BaseModel):
    status: str
    result: str | None = None
    submitted_at: str | None = None


# ── Essay Questions ──

class EssayQuestionResponse(BaseModel):
    id: str
    company_name: str
    period: str | None = None
    question_number: int
    question: str
    char_limit: int | None = None
    category: str | None = None

class EssayQuestionCreate(BaseModel):
    company_name: str
    period: str | None = None
    question_number: int
    question: str
    char_limit: int | None = None
    category: str | None = None
