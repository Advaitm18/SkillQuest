import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware

from app.routes import auth, users, skills, quiz, gamification, interview
from app.http_client import create_shared_http_client, set_http_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.init_db import init_db

    await init_db()
    http = create_shared_http_client()
    set_http_client(http)
    from app.routes.interview import prime_did_presenter_from_disk

    await prime_did_presenter_from_disk()
    try:
        yield
    finally:
        await http.aclose()
        set_http_client(None)


app = FastAPI(
    title="SkillQuest API",
    description="AI-Powered Gamified Upskilling Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=800)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(skills.router, prefix="/api/skills", tags=["Skills"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(gamification.router, prefix="/api/gamification", tags=["Gamification"])
app.include_router(interview.router, prefix="/api/interview", tags=["AI Interview"])

# ── Static files (custom D-ID avatar images, etc.) ────────────────────────────
_public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
os.makedirs(_public_dir, exist_ok=True)
app.mount("/public", StaticFiles(directory=_public_dir), name="public")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SkillQuest API v1.0.0"}


@app.get("/")
async def root():
    return {"message": "Welcome to SkillQuest API", "docs": "/docs"}
