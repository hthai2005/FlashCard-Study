from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import auth, flashcards, study, leaderboard, ai, admin, reports
from pathlib import Path
from sqlalchemy import text, inspect

# Create database tables
Base.metadata.create_all(bind=engine)

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

# Migration: Add status column to flashcard_sets if not exists
def migrate_add_status():
    """Thêm cột status vào bảng flashcard_sets nếu chưa có"""
    try:
        if not str(engine.url).startswith("sqlite"):
            with engine.connect() as conn:
                check_query = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='flashcard_sets' AND column_name='status';
                """)
                result = conn.execute(check_query)
                
                if result.fetchone() is None:
                    alter_query = text("ALTER TABLE flashcard_sets ADD COLUMN status VARCHAR(20) DEFAULT 'pending';")
                    conn.execute(alter_query)
                    # Update existing records to 'approved'
                    update_query = text("UPDATE flashcard_sets SET status = 'approved' WHERE status IS NULL;")
                    conn.execute(update_query)
                    conn.commit()
                    print("✅ Đã thêm cột status vào bảng flashcard_sets")
                else:
                    print("ℹ️  Cột status đã tồn tại trong database")
        else:
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('flashcard_sets')]
            if 'status' not in columns:
                with engine.connect() as conn:
                    alter_query = text("ALTER TABLE flashcard_sets ADD COLUMN status VARCHAR(20) DEFAULT 'pending';")
                    conn.execute(alter_query)
                    update_query = text("UPDATE flashcard_sets SET status = 'approved' WHERE status IS NULL;")
                    conn.execute(update_query)
                    conn.commit()
                    print("✅ Đã thêm cột status vào bảng flashcard_sets (SQLite)")
            else:
                print("ℹ️  Cột status đã tồn tại trong database (SQLite)")
    except Exception as e:
        print(f"⚠️  Lỗi khi migration status: {e}")

# Migration: Create reports table if not exists
def migrate_create_reports_table():
    """Tạo bảng reports nếu chưa có"""
    try:
        if not str(engine.url).startswith("sqlite"):
            with engine.connect() as conn:
                check_query = text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_name='reports';
                """)
                result = conn.execute(check_query)
                
                if result.fetchone() is None:
                    create_query = text("""
                        CREATE TABLE reports (
                            id SERIAL PRIMARY KEY,
                            report_type VARCHAR(20) NOT NULL,
                            reported_item_id INTEGER NOT NULL,
                            reporter_id INTEGER NOT NULL REFERENCES users(id),
                            reason VARCHAR(50) NOT NULL,
                            description TEXT,
                            status VARCHAR(20) DEFAULT 'pending',
                            admin_notes TEXT,
                            resolved_by INTEGER REFERENCES users(id),
                            resolved_at TIMESTAMP WITH TIME ZONE,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    conn.execute(create_query)
                    conn.commit()
                    print("✅ Đã tạo bảng reports")
                else:
                    print("ℹ️  Bảng reports đã tồn tại")
        else:
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            if 'reports' not in tables:
                with engine.connect() as conn:
                    create_query = text("""
                        CREATE TABLE reports (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            report_type VARCHAR(20) NOT NULL,
                            reported_item_id INTEGER NOT NULL,
                            reporter_id INTEGER NOT NULL REFERENCES users(id),
                            reason VARCHAR(50) NOT NULL,
                            description TEXT,
                            status VARCHAR(20) DEFAULT 'pending',
                            admin_notes TEXT,
                            resolved_by INTEGER REFERENCES users(id),
                            resolved_at TIMESTAMP,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    conn.execute(create_query)
                    conn.commit()
                    print("✅ Đã tạo bảng reports (SQLite)")
            else:
                print("ℹ️  Bảng reports đã tồn tại (SQLite)")
    except Exception as e:
        print(f"⚠️  Lỗi khi migration reports table: {e}")

# Chạy migrations
migrate_add_avatar_url()
migrate_add_status()
migrate_create_reports_table()

# Tự động tạo admin account nếu chưa có
def create_default_admin():
    """Tạo tài khoản admin mặc định nếu chưa có"""
    try:
        from app.database import SessionLocal
        from app import models, auth
        
        db = SessionLocal()
        try:
            # Kiểm tra xem đã có admin chưa
            admin = db.query(models.User).filter(models.User.username == "admin").first()
            if not admin:
                # Tạo admin
                admin_password = "admin123"
                hashed_password = auth.get_password_hash(admin_password)
                admin_user = models.User(
                    username="admin",
                    email="admin@example.com",
                    hashed_password=hashed_password,
                    is_active=True,
                    is_admin=True
                )
                db.add(admin_user)
                db.flush()
                
                # Tạo leaderboard entry cho admin
                admin_leaderboard = models.Leaderboard(user_id=admin_user.id)
                db.add(admin_leaderboard)
                
                db.commit()
                print("✅ Đã tạo tài khoản admin mặc định (username: admin, password: admin123)")
            else:
                print("ℹ️  Tài khoản admin đã tồn tại")
        except Exception as e:
            db.rollback()
            print(f"⚠️  Lỗi khi tạo admin: {e}")
        finally:
            db.close()
    except Exception as e:
        print(f"⚠️  Lỗi khi khởi tạo admin: {e}")

create_default_admin()

# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads/avatars")
uploads_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(
        title="Studycard API",
        description="API for Studycard application with spaced repetition",
        version="1.0.0"
    )

# CORS middleware
# Lưu ý: Sau khi deploy frontend lên Vercel, thêm URL Vercel vào đây
# Ví dụ: "https://flashcard-app.vercel.app"
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
        # URL Vercel frontend
        "https://flash-card-study-eta.vercel.app",
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
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

# Mount static files for avatar uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"message": "Studycard API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

