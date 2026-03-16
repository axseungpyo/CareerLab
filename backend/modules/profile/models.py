"""Profile, CareerEntry, Course, LanguageTest, Certification, Award Pydantic models."""

from pydantic import BaseModel, Field


# ── Education ──

class EducationItem(BaseModel):
    school: str
    major: str
    degree: str
    period: str | None = None
    # Samsung-style extended fields
    level: str | None = None  # high_school, university, graduate
    major_category: str | None = None  # 전공계열
    degree_type: str | None = None  # 주전공/복수전공/부전공
    minor: str | None = None
    double_major: str | None = None
    college: str | None = None  # 단과대학
    country: str | None = None
    gpa: str | None = None
    gpa_scale: str | None = None  # 4.5, 4.3, 4.0, 100
    gpa_type: str | None = None
    graduation_status: str | None = None  # 졸업/재학/휴학/졸업예정/중퇴/수료
    period_start: str | None = None  # YYYY-MM
    period_end: str | None = None
    student_id: str | None = None
    is_transfer: bool | None = None


# ── Military Service ──

class MilitaryService(BaseModel):
    status: str | None = None  # completed, in_service, exempted, not_applicable
    discharge_type: str | None = None  # 만기제대, 의가사제대 등
    branch: str | None = None  # 육군, 해군, 공군, 해병대
    rank: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    note: str | None = None  # 주요활동사항 (100자)


# ── Profile ──

class ProfileCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    education: list[EducationItem] | None = None
    summary: str | None = None
    career_goal: str | None = None
    core_values: list[str] | None = None
    # Samsung-style extended fields
    name_en: str | None = None
    address: str | None = None
    phone_secondary: str | None = None
    military_service: MilitaryService | dict | None = None
    hobbies: str | None = None
    role_model: str | None = None
    role_model_reason: str | None = None
    academic_note: str | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    education: list[EducationItem] | None = None
    summary: str | None = None
    career_goal: str | None = None
    core_values: list[str] | None = None
    name_en: str | None = None
    address: str | None = None
    phone_secondary: str | None = None
    military_service: MilitaryService | dict | None = None
    hobbies: str | None = None
    role_model: str | None = None
    role_model_reason: str | None = None
    academic_note: str | None = None


class ProfileResponse(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    education: list[EducationItem] | None = None
    summary: str | None = None
    career_goal: str | None = None
    core_values: list[str] | None = None
    name_en: str | None = None
    address: str | None = None
    phone_secondary: str | None = None
    military_service: MilitaryService | dict | None = None
    hobbies: str | None = None
    role_model: str | None = None
    role_model_reason: str | None = None
    academic_note: str | None = None
    created_at: str
    updated_at: str


# ── Career Entry ──

class CareerEntryCreate(BaseModel):
    profile_id: str
    entry_type: str = Field(pattern=r"^(career|project|skill|story|activity|training)$")
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
    # Samsung-style extended fields
    employment_type: str | None = None  # full_time/contract/intern/part_time/freelance
    department: str | None = None
    location: str | None = None
    is_current: bool | None = None
    activity_category: str | None = None  # 국내연수/해외연수/동아리/봉사 등


class CareerEntryUpdate(BaseModel):
    entry_type: str | None = Field(default=None, pattern=r"^(career|project|skill|story|activity|training)$")
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
    employment_type: str | None = None
    department: str | None = None
    location: str | None = None
    is_current: bool | None = None
    activity_category: str | None = None


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
    employment_type: str | None = None
    department: str | None = None
    location: str | None = None
    is_current: bool | None = None
    activity_category: str | None = None
    created_at: str
    updated_at: str


# ── Course (이수교과목) ──

class CourseCreate(BaseModel):
    profile_id: str
    school_name: str
    year: int | None = None
    semester: str | None = None  # 1, 2, summer, winter
    course_name: str
    category: str  # major_required, major_elective, general, other
    credits: int | None = None
    pass_fail: bool = False


class CourseResponse(BaseModel):
    id: str
    profile_id: str
    school_name: str
    year: int | None = None
    semester: str | None = None
    course_name: str
    category: str
    credits: int | None = None
    pass_fail: bool
    created_at: str


# ── Language Test (외국어) ──

class LanguageTestCreate(BaseModel):
    profile_id: str
    language: str = "영어"
    test_name: str  # OPIc, TOEIC, TOEIC-Speaking, TOEFL, TEPS, JPT, HSK 등
    score: str | None = None
    level: str | None = None
    max_score: str | None = None
    test_date: str | None = None
    test_location: str = "국내"
    cert_number: str | None = None
    is_primary: bool = False


class LanguageTestResponse(BaseModel):
    id: str
    profile_id: str
    language: str
    test_name: str
    score: str | None = None
    level: str | None = None
    max_score: str | None = None
    test_date: str | None = None
    test_location: str
    cert_number: str | None = None
    is_primary: bool
    created_at: str


# ── Certification (자격증) ──

class CertificationCreate(BaseModel):
    profile_id: str
    cert_name: str
    cert_level: str | None = None
    acquired_date: str | None = None
    cert_number: str | None = None
    issuer: str | None = None


class CertificationResponse(BaseModel):
    id: str
    profile_id: str
    cert_name: str
    cert_level: str | None = None
    acquired_date: str | None = None
    cert_number: str | None = None
    issuer: str | None = None
    created_at: str


# ── Award (수상경력) ──

class AwardCreate(BaseModel):
    profile_id: str
    title: str
    organization: str | None = None
    award_date: str | None = None
    description: str | None = None


class AwardResponse(BaseModel):
    id: str
    profile_id: str
    title: str
    organization: str | None = None
    award_date: str | None = None
    description: str | None = None
    created_at: str
