from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import auth, flashcards, study, leaderboard, ai, admin
from pathlib import Path

# Create database tables
Base.metadata.create_all(bind=engine)

# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads/avatars")
uploads_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Flashcard Study App API",
    description="API for flashcard study application with spaced repetition",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
        "https://your-vercel-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(study.router, prefix="/api/study", tags=["Study"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["Leaderboard"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# Mount static files for avatar uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"message": "Flashcard Study App API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

