"""Interview Pydantic models."""

from pydantic import BaseModel


class QuestionGenRequest(BaseModel):
    resume_id: str


class InterviewQuestionResponse(BaseModel):
    id: str
    resume_id: str
    category: str
    question: str
    answer_guide: str | None = None
    difficulty: str
    created_at: str


class MockStartRequest(BaseModel):
    resume_id: str
    mode: str = "normal"  # normal | pressure | pt


class MockChatRequest(BaseModel):
    session_id: str
    content: str


class MockSessionResponse(BaseModel):
    id: str
    resume_id: str
    mode: str
    status: str
    overall_score: int | None = None
    evaluation: dict | None = None
    started_at: str
    completed_at: str | None = None


class MockMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    feedback: dict | None = None
    score: int | None = None
    created_at: str


class EvaluationResponse(BaseModel):
    session_id: str
    overall_score: int
    evaluation: dict
