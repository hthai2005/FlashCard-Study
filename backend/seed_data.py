"""
Script để tạo dữ liệu mẫu cho ứng dụng Flashcard Study App
Tạo 2 tài khoản: 1 user test và 1 admin
"""
from app.database import SessionLocal, engine, Base
from app import models
import bcrypt

# Tạo lại database tables (xóa và tạo mới)
def init_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✅ Database đã được tạo lại")

def create_sample_users():
    db = SessionLocal()
    try:
        # Kiểm tra xem đã có user chưa
        existing_users = db.query(models.User).count()
        if existing_users > 0:
            print("⚠️  Đã có dữ liệu trong database. Bỏ qua việc tạo dữ liệu mẫu.")
            print("   Nếu muốn tạo lại, hãy xóa file flashcard_app.db và chạy lại script này.")
            return
        
        # 1. Tạo Admin user
        admin_password = "admin123"
        # Sử dụng bcrypt trực tiếp (tương thích với passlib verify)
        admin_hashed = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin_user = models.User(
            username="admin",
            email="admin@example.com",
            hashed_password=admin_hashed,
            is_active=True,
            is_admin=True
        )
        db.add(admin_user)
        db.flush()  # Để lấy ID
        
        # Tạo leaderboard entry cho admin
        admin_leaderboard = models.Leaderboard(user_id=admin_user.id)
        db.add(admin_leaderboard)
        
        # 2. Tạo Test user
        test_password = "test123"
        # Sử dụng bcrypt trực tiếp (tương thích với passlib verify)
        test_hashed = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        test_user = models.User(
            username="testuser",
            email="test@example.com",
            hashed_password=test_hashed,
            is_active=True,
            is_admin=False
        )
        db.add(test_user)
        db.flush()
        
        # Tạo leaderboard entry cho test user
        test_leaderboard = models.Leaderboard(user_id=test_user.id)
        db.add(test_leaderboard)
        
        # 3. Tạo một flashcard set mẫu cho test user
        sample_set = models.FlashcardSet(
            title="Từ vựng tiếng Anh cơ bản",
            description="Bộ flashcard học từ vựng tiếng Anh cơ bản",
            owner_id=test_user.id,
            is_public=True
        )
        db.add(sample_set)
        db.flush()
        
        # Thêm một số flashcards mẫu
        sample_flashcards = [
            {"front": "Hello", "back": "Xin chào"},
            {"front": "Goodbye", "back": "Tạm biệt"},
            {"front": "Thank you", "back": "Cảm ơn"},
            {"front": "Please", "back": "Xin vui lòng"},
            {"front": "Sorry", "back": "Xin lỗi"}
        ]
        
        for card_data in sample_flashcards:
            flashcard = models.Flashcard(
                set_id=sample_set.id,
                front=card_data["front"],
                back=card_data["back"]
            )
            db.add(flashcard)
        
        db.commit()
        
        print("\n✅ Đã tạo dữ liệu mẫu thành công!")
        print("\n📋 Thông tin đăng nhập:")
        print("=" * 50)
        print("👤 ADMIN:")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Email: admin@example.com")
        print("\n👤 TEST USER:")
        print("   Username: testuser")
        print("   Password: test123")
        print("   Email: test@example.com")
        print("=" * 50)
        print("\n💡 Bạn có thể đăng nhập với các tài khoản trên!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khi tạo dữ liệu mẫu: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Bắt đầu tạo dữ liệu mẫu...")
    print("⚠️  Cảnh báo: Script này sẽ XÓA toàn bộ dữ liệu hiện có và tạo lại!")
    
    response = input("\nBạn có chắc chắn muốn tiếp tục? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        init_db()
        create_sample_users()
    else:
        print("❌ Đã hủy. Không có thay đổi nào được thực hiện.")

