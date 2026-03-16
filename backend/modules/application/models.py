"""Application models — Pydantic schemas for job application tracking."""

from datetime import datetime
from pydantic import BaseModel


class ApplicationCreate(BaseModel):
    profile_id: str
    company_name: str
    job_title: str | None = None
    job_url: str | None = None
    stage: str = "interested"
    deadline: datetime | None = None
    interview_date: datetime | None = None
    notes: str | None = None
    resume_id: str | None = None
    company_analysis_id: str | None = None


class ApplicationUpdate(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    job_url: str | None = None
    deadline: datetime | None = None
    interview_date: datetime | None = None
    notes: str | None = None
    result: str | None = None
    resume_id: str | None = None


class StageUpdate(BaseModel):
    stage: str
    result: str | None = None


class ApplicationResponse(BaseModel):
    id: str
    profile_id: str
    company_name: str
    job_title: str | None = None
    job_url: str | None = None
    stage: str
    result: str | None = None
    deadline: datetime | None = None
    interview_date: datetime | None = None
    notes: str | None = None
    resume_id: str | None = None
    company_analysis_id: str | None = None
    parsed_data: dict | None = None
    created_at: datetime
    updated_at: datetime


class UrlParseRequest(BaseModel):
    url: str


class UrlParseResponse(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    deadline: str | None = None
    requirements: list[str] = []
    keywords: list[str] = []
    raw_text: str | None = None
