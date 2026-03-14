"""Interview API routes — question generation, mock interview, evaluation.
Also includes review/feedback endpoints."""

import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from modules.interview.models import (
    QuestionGenRequest,
    InterviewQuestionResponse,
    MockStartRequest,
    MockChatRequest,
    MockSessionResponse,
    EvaluationResponse,
)
from modules.interview.question_gen import QuestionGenerator
from modules.interview.mock import MockInterviewManager
from modules.interview.evaluator import InterviewEvaluator
from modules.resume.feedback import FeedbackEngine
from pydantic import BaseModel

router = APIRouter()


# ── Question Generation ──

@router.post("/generate-questions", response_model=list[InterviewQuestionResponse])
async def generate_questions(req: QuestionGenRequest):
    gen = QuestionGenerator()
    try:
        return await gen.generate(req.resume_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/questions/{resume_id}", response_model=list[InterviewQuestionResponse])
async def get_questions(resume_id: str):
    gen = QuestionGenerator()
    return gen.get_questions(resume_id)


# ── Mock Interview ──

@router.post("/mock/start", response_model=MockSessionResponse)
async def start_mock(req: MockStartRequest):
    mgr = MockInterviewManager()
    return mgr.start_session(req.resume_id, req.mode)


@router.post("/mock/chat")
async def mock_chat(req: MockChatRequest):
    """Stream interviewer response."""
    mgr = MockInterviewManager()
    try:
        stream = mgr.chat(req.session_id, req.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    async def sse_stream():
        async for chunk in stream:
            yield f"0:{json.dumps(chunk, ensure_ascii=False)}\n"
        yield f'e:{json.dumps({"finishReason": "stop"})}\n'
        yield "d:{}\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/plain; charset=utf-8",
        headers={"X-Vercel-AI-Data-Stream": "v1"},
    )


@router.post("/mock/end", response_model=MockSessionResponse)
async def end_mock(session_id: str):
    mgr = MockInterviewManager()
    return mgr.end_session(session_id)


@router.get("/mock/{session_id}", response_model=MockSessionResponse)
async def get_session(session_id: str):
    mgr = MockInterviewManager()
    result = mgr.get_session(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    return result


# ── Evaluation ──

@router.post("/evaluate/{session_id}", response_model=EvaluationResponse)
async def evaluate_session(session_id: str):
    evaluator = InterviewEvaluator()
    try:
        return await evaluator.evaluate(session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Review / Feedback ──

class ReviewRequest(BaseModel):
    resume_item_id: str
    question: str
    answer: str
    company_analysis: str | None = None


@router.post("/review/analyze")
async def analyze_review(req: ReviewRequest):
    engine = FeedbackEngine()
    return await engine.analyze(
        req.resume_item_id, req.question, req.answer, req.company_analysis
    )


@router.get("/review/{report_id}")
async def get_review(report_id: str):
    engine = FeedbackEngine()
    result = engine.get_report(report_id)
    if not result:
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
    return result


@router.post("/review/apply/{report_id}")
async def apply_review(report_id: str):
    engine = FeedbackEngine()
    try:
        return await engine.apply_suggestion(report_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
