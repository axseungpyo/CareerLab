"""Profile & CareerEntry Pydantic models."""

from pydantic import BaseModel, Field


class EducationItem(BaseModel):
    school: str
    major: str
    degree: str
    period: str


class ProfileCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    education: list[EducationItem] | None = None
    summary: str | None = None
    career_goal: str | None = None
    core_values: list[str] | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    education: list[EducationItem] | None = None
    summary: str | None = None
    career_goal: str | None = None
    core_values: list[str] | None = None


class ProfileResponse(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    education: list[EducationItem] | None = None
    summary: str | None = None
    career_goal: str | None = None
    core_values: list[str] | None = None
    created_at: str
    updated_at: str


class CareerEntryCreate(BaseModel):
    profile_id: str
    entry_type: str = Field(pattern=r"^(career|project|skill|story)$")
    title: str
    content: str
    period_start: str | None = None
    period_end: str | None = None
    company: str | None = None
    position: str | None = None
    star_situation: str | None = None
    star_task: str | None = None
    star_action: str | None = None
    star_result: str | None = None
    tags: list[str] | None = None
    quantified_results: dict | None = None


class CareerEntryUpdate(BaseModel):
    entry_type: str | None = Field(default=None, pattern=r"^(career|project|skill|story)$")
    title: str | None = None
    content: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    company: str | None = None
    position: str | None = None
    star_situation: str | None = None
    star_task: str | None = None
    star_action: str | None = None
    star_result: str | None = None
    tags: list[str] | None = None
    quantified_results: dict | None = None


class CareerEntryResponse(BaseModel):
    id: str
    profile_id: str
    entry_type: str
    title: str
    content: str
    period_start: str | None = None
    period_end: str | None = None
    company: str | None = None
    position: str | None = None
    star_situation: str | None = None
    star_task: str | None = None
    star_action: str | None = None
    star_result: str | None = None
    tags: list[str] | None = None
    quantified_results: dict | None = None
    created_at: str
    updated_at: str
