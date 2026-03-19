"""Resume API routes — company analysis, resume generation, CRUD."""

import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from modules.resume.models import (
    CompanyAnalysisCreate,
    CompanyAnalysisResponse,
    ResumeCreate,
    ResumeResponse,
    ResumeItemCreate,
    ResumeItemResponse,
    ResumeItemUpdate,
    GenerateRequest,
    StatusUpdate,
)
from modules.resume.analyzer import CompanyAnalyzer
from modules.resume.generator import ResumeGenerator

router = APIRouter()


# ── Company Analysis ──

@router.post("/analyze-company", response_model=CompanyAnalysisResponse)
async def analyze_company(data: CompanyAnalysisCreate):
    analyzer = CompanyAnalyzer()
    result = await analyzer.analyze(
        data.company_name, data.job_posting_text, data.job_posting_url
    )
    return result


@router.get("/analyses", response_model=list[CompanyAnalysisResponse])
async def list_analyses():
    analyzer = CompanyAnalyzer()
    return analyzer.get_analyses()


@router.get("/analyses/{analysis_id}", response_model=CompanyAnalysisResponse)
async def get_analysis(analysis_id: str):
    analyzer = CompanyAnalyzer()
    result = analyzer.get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="기업 분석을 찾을 수 없습니다.")
    return result


# ── Resume Generation (SSE) ──

@router.post("/generate")
async def generate_resume(req: GenerateRequest):
    """Generate resume answer via Claude streaming."""
    gen = ResumeGenerator()
    try:
        result = await gen.generate(
            profile_id=req.profile_id,
            company_analysis_id=req.company_analysis_id,
            question=req.question,
            char_limit=req.char_limit,
            tone=req.tone,
            emphasis=req.emphasis,
            stream=True,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    async def sse_stream():
        full_text = ""
        async for chunk in result:
            full_text += chunk
            yield f"0:{json.dumps(chunk, ensure_ascii=False)}\n"
        yield f'e:{json.dumps({"finishReason": "stop"})}\n'
        yield "d:{}\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/plain; charset=utf-8",
        headers={"X-Vercel-AI-Data-Stream": "v1"},
    )


# ── Resume Items (must be before /{resume_id} to avoid route conflict) ──

@router.post("/items", response_model=ResumeItemResponse, status_code=201)
async def create_item(data: ResumeItemCreate):
    gen = ResumeGenerator()
    return gen.create_resume_item(data.model_dump(exclude_none=True))


@router.put("/items/{item_id}", response_model=ResumeItemResponse)
async def update_item(item_id: str, data: ResumeItemUpdate):
    gen = ResumeGenerator()
    return gen.update_resume_item(item_id, data.model_dump(exclude_none=True))


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: str):
    """Delete a resume item."""
    gen = ResumeGenerator()
    gen._db.table("resume_items").delete().eq("id", item_id).execute()


# ── Resume CRUD ──

@router.post("", response_model=ResumeResponse, status_code=201)
async def create_resume(data: ResumeCreate):
    gen = ResumeGenerator()
    return gen.create_resume(data.model_dump())


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(profile_id: str | None = None):
    gen = ResumeGenerator()
    return gen.get_resumes(profile_id)


@router.get("/{resume_id}")
async def get_resume(resume_id: str):
    gen = ResumeGenerator()
    result = gen.get_resume(resume_id)
    if not result:
        raise HTTPException(status_code=404, detail="자소서를 찾을 수 없습니다.")
    return result


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(resume_id: str):
    """Delete a resume and all its items."""
    gen = ResumeGenerator()
    gen._db.table("resume_items").delete().eq("resume_id", resume_id).execute()
    gen._db.table("resumes").delete().eq("id", resume_id).execute()


@router.put("/{resume_id}/status", response_model=ResumeResponse)
async def update_status(resume_id: str, data: StatusUpdate):
    gen = ResumeGenerator()
    return gen.update_resume_status(
        resume_id, data.status, **(data.model_dump(exclude={"status"}, exclude_none=True))
    )


@router.get("/{resume_id}/items", response_model=list[ResumeItemResponse])
async def list_items(resume_id: str):
    gen = ResumeGenerator()
    return gen.get_resume_items(resume_id)


@router.get("/{resume_id}/items/versions")
async def list_item_versions(resume_id: str, question: str):
    """Get all versions of a resume item with the same question."""
    gen = ResumeGenerator()
    return gen.get_item_versions(resume_id, question)


# ── Export ──

@router.get("/{resume_id}/export")
async def export_resume(resume_id: str, format: str = "docx"):
    """Export resume as DOCX or PDF file."""
    from fastapi.responses import Response
    from modules.resume.exporter import ResumeExporter

    exporter = ResumeExporter()
    try:
        if format == "pdf":
            pdf_bytes = exporter.to_pdf(resume_id)
            # Check if weasyprint returned PDF or HTML fallback
            is_pdf = pdf_bytes[:4] == b"%PDF"
            return Response(
                content=pdf_bytes,
                media_type="application/pdf" if is_pdf else "text/html; charset=utf-8",
                headers={"Content-Disposition": f'attachment; filename="resume_{resume_id}.{"pdf" if is_pdf else "html"}"'},
            )
        else:
            docx_bytes = exporter.to_docx(resume_id)
            return Response(
                content=docx_bytes,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": f'attachment; filename="resume_{resume_id}.docx"'},
            )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Research Files ──

@router.get("/research/files")
async def list_research_files():
    """List .md files from ~/Documents/career/research/."""
    from pathlib import Path

    research_dir = Path.home() / "Documents" / "career" / "research"
    if not research_dir.exists():
        return []

    files = []
    for f in sorted(research_dir.glob("*.md")):
        files.append({
            "name": f.name,
            "path": str(f),
            "size": f.stat().st_size,
            "modified": f.stat().st_mtime,
        })
    return files


@router.post("/research/import")
async def import_research(file_path: str):
    """Import a research .md file content."""
    from pathlib import Path

    p = Path(file_path)
    research_dir = Path.home() / "Documents" / "career" / "research"
    if not str(p).startswith(str(research_dir)):
        raise HTTPException(status_code=400, detail="허용되지 않는 경로입니다.")
    if not p.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    return {"content": p.read_text(encoding="utf-8")}
