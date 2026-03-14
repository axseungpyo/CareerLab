"""SSE streaming chat route — Vercel AI SDK compatible."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.llm_router import TaskType, call_llm, LLMCallError

router = APIRouter()


class ChatRequest(BaseModel):
    messages: list[dict]
    task_type: TaskType
    stream: bool = True


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    """SSE streaming endpoint — Vercel AI SDK compatible format."""
    try:
        result = await call_llm(req.messages, req.task_type, stream=True)
    except LLMCallError as e:
        raise HTTPException(status_code=502, detail=str(e))

    async def sse_generator():
        try:
            async for chunk in result:
                # Vercel AI SDK data stream format
                yield f"0:{_json_encode(chunk)}\n"
            # End signal
            yield 'e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'
            yield "d:{}\n"
        except Exception as e:
            yield f'3:{_json_encode(str(e))}\n'

    return StreamingResponse(
        sse_generator(),
        media_type="text/plain; charset=utf-8",
        headers={
            "X-Vercel-AI-Data-Stream": "v1",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("")
async def chat(req: ChatRequest):
    """Non-streaming chat endpoint."""
    try:
        result = await call_llm(req.messages, req.task_type, stream=False)
        return {"content": result}
    except LLMCallError as e:
        raise HTTPException(status_code=502, detail=str(e))


def _json_encode(s: str) -> str:
    import json
    return json.dumps(s, ensure_ascii=False)
