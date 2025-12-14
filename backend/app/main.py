from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import auth, flashcards, study, leaderboard, ai, admin
from pathlib import Path
<<<<<<< HEAD
from sqlalchemy import text, inspect
=======
>>>>>>> 0b2d28d8543ea39bd4791f8a41b5e9c34f5e3808

# Create database tables
Base.metadata.create_all(bind=engine)

<<<<<<< HEAD
# Migration: Add avatar_url column if not exists
def migrate_add_avatar_url():
    """Thêm cột avatar_url vào bảng users nếu chưa có"""
    try:
        # Kiểm tra xem có phải PostgreSQL không
        if not str(engine.url).startswith("sqlite"):
            with engine.connect() as conn:
                # Kiểm tra cột đã tồn tại chưa
                check_query = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='avatar_url';
                """)
                result = conn.execute(check_query)
                
                if result.fetchone() is None:
                    # Thêm cột
                    alter_query = text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);")
                    conn.execute(alter_query)
                    conn.commit()
                    print("✅ Đã thêm cột avatar_url vào bảng users")
                else:
                    print("ℹ️  Cột avatar_url đã tồn tại trong database")
        else:
            # SQLite - kiểm tra bằng inspect
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('users')]
            if 'avatar_url' not in columns:
                with engine.connect() as conn:
                    alter_query = text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);")
                    conn.execute(alter_query)
                    conn.commit()
                    print("✅ Đã thêm cột avatar_url vào bảng users (SQLite)")
            else:
                print("ℹ️  Cột avatar_url đã tồn tại trong database (SQLite)")
    except Exception as e:
        print(f"⚠️  Lỗi khi migration avatar_url: {e}")
        # Không throw exception để app vẫn chạy được

# Chạy migration
migrate_add_avatar_url()

=======
>>>>>>> 0b2d28d8543ea39bd4791f8a41b5e9c34f5e3808
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

