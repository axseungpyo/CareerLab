"""CareerLab FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings

settings = get_settings()

app = FastAPI(
    title="CareerLab API",
    description="AI 커리어 컨설팅 에이전트 백엔드",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "careerlab"}


@app.get("/api/health/oauth")
async def oauth_health():
    """Check all service connection statuses."""
    from api.routes.settings import connection_status
    return await connection_status()


# Route registration
from api.routes import chat, profile, resume, interview, settings as settings_routes

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(resume.router, prefix="/api/resume", tags=["resume"])
app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(settings_routes.router, prefix="/api/settings", tags=["settings"])
