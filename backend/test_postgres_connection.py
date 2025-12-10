"""
Script kiểm tra kết nối PostgreSQL
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./flashcard_app.db")

print("🔍 Kiểm tra kết nối database...")
print(f"📋 DATABASE_URL: {DATABASE_URL.split('@')[0]}@...")  # Ẩn password

try:
    if DATABASE_URL.startswith("sqlite"):
        print("⚠️  Đang dùng SQLite, không phải PostgreSQL!")
        print("💡 Hãy cập nhật DATABASE_URL trong file .env")
    else:
        # PostgreSQL
        engine = create_engine(DATABASE_URL)
        
        # Test kết nối
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ Kết nối PostgreSQL thành công!")
            print(f"📊 PostgreSQL Version: {version.split(',')[0]}")
            
            # Kiểm tra database
            result = conn.execute(text("SELECT current_database();"))
            db_name = result.fetchone()[0]
            print(f"📁 Database hiện tại: {db_name}")
            
            # Kiểm tra tables
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result]
            
            if tables:
                print(f"📋 Tables trong database ({len(tables)}):")
                for table in tables:
                    print(f"   - {table}")
            else:
                print("⚠️  Chưa có tables nào. Hãy chạy: python seed_data.py")
                
except Exception as e:
    print(f"❌ Lỗi kết nối: {e}")
    print("\n💡 Kiểm tra:")
    print("   1. PostgreSQL đã được cài đặt và đang chạy?")
    print("   2. Database 'flashcard_db' đã được tạo?")
    print("   3. Username và password trong .env đúng chưa?")
    print("   4. Port PostgreSQL đúng chưa? (mặc định: 5432)")






