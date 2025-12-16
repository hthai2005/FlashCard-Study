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
            print("   Nếu muốn tạo lại, hãy chạy lại script này và chọn 'yes'.")
            return
        
        # 1. Tạo Admin user
        admin_password = "admin123"
        # Sử dụng bcrypt trực tiếp (passlib có thể verify bcrypt hash)
        # Format: $2b$... tương thích với passlib
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
        # Sử dụng bcrypt trực tiếp (passlib có thể verify bcrypt hash)
        # Format: $2b$... tương thích với passlib
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
        
        # 3. Tạo nhiều flashcard sets mẫu cho test user
        from datetime import datetime, timedelta, timezone
        
        # Set 1: Từ vựng tiếng Anh cơ bản
        set1 = models.FlashcardSet(
            title="Từ vựng tiếng Anh cơ bản",
            description="Bộ flashcard học từ vựng tiếng Anh cơ bản",
            owner_id=test_user.id,
            is_public=True,
            status='approved'  # Auto-approve seed data
        )
        db.add(set1)
        db.flush()
        
        set1_cards = [
            {"front": "Hello", "back": "Xin chào"},
            {"front": "Goodbye", "back": "Tạm biệt"},
            {"front": "Thank you", "back": "Cảm ơn"},
            {"front": "Please", "back": "Xin vui lòng"},
            {"front": "Sorry", "back": "Xin lỗi"},
            {"front": "Yes", "back": "Có"},
            {"front": "No", "back": "Không"},
            {"front": "Water", "back": "Nước"},
            {"front": "Food", "back": "Thức ăn"},
            {"front": "House", "back": "Ngôi nhà"}
        ]
        
        set1_flashcards = []
        for card_data in set1_cards:
            flashcard = models.Flashcard(
                set_id=set1.id,
                front=card_data["front"],
                back=card_data["back"]
            )
            db.add(flashcard)
            set1_flashcards.append(flashcard)
        db.flush()
        
        # Set 2: Toán học cơ bản
        set2 = models.FlashcardSet(
            title="Toán học cơ bản",
            description="Các công thức và khái niệm toán học cơ bản",
            owner_id=test_user.id,
            is_public=True,
            status='approved'  # Auto-approve seed data
        )
        db.add(set2)
        db.flush()
        
        set2_cards = [
            {"front": "2 + 2 = ?", "back": "4"},
            {"front": "5 × 3 = ?", "back": "15"},
            {"front": "10 ÷ 2 = ?", "back": "5"},
            {"front": "Diện tích hình vuông", "back": "Cạnh × Cạnh"},
            {"front": "Chu vi hình chữ nhật", "back": "(Dài + Rộng) × 2"}
        ]
        
        set2_flashcards = []
        for card_data in set2_cards:
            flashcard = models.Flashcard(
                set_id=set2.id,
                front=card_data["front"],
                back=card_data["back"]
            )
            db.add(flashcard)
            set2_flashcards.append(flashcard)
        db.flush()
        
        # Set 3: Lịch sử Việt Nam
        set3 = models.FlashcardSet(
            title="Lịch sử Việt Nam",
            description="Các sự kiện lịch sử quan trọng của Việt Nam",
            owner_id=test_user.id,
            is_public=False,
            status='approved'  # Auto-approve seed data
        )
        db.add(set3)
        db.flush()
        
        set3_cards = [
            {"front": "Năm độc lập của Việt Nam", "back": "1945"},
            {"front": "Chiến thắng Điện Biên Phủ", "back": "1954"},
            {"front": "Ngày thống nhất đất nước", "back": "30/4/1975"},
            {"front": "Thủ đô của Việt Nam", "back": "Hà Nội"}
        ]
        
        set3_flashcards = []
        for card_data in set3_cards:
            flashcard = models.Flashcard(
                set_id=set3.id,
                front=card_data["front"],
                back=card_data["back"]
            )
            db.add(flashcard)
            set3_flashcards.append(flashcard)
        db.flush()
        
        # 4. Tạo Study Records với dữ liệu học tập mẫu
        now = datetime.now(timezone.utc)
        
        # Tạo study records cho set1 (đã học một số cards)
        for i, card in enumerate(set1_flashcards[:7]):  # 7 cards đầu đã học
            study_record = models.StudyRecord(
                flashcard_id=card.id,
                user_id=test_user.id,
                ease_factor=2.5 + (i * 0.1),
                interval=max(1, i),
                repetitions=i + 1,
                next_review_date=now + timedelta(days=i),
                last_reviewed=now - timedelta(days=1),
                total_reviews=i + 1,
                correct_count=i + 1,
                incorrect_count=0
            )
            db.add(study_record)
        
        # Tạo study records cho set2 (đã học một số cards)
        for i, card in enumerate(set2_flashcards[:3]):  # 3 cards đầu đã học
            study_record = models.StudyRecord(
                flashcard_id=card.id,
                user_id=test_user.id,
                ease_factor=2.5,
                interval=1,
                repetitions=1,
                next_review_date=now + timedelta(days=1),
                last_reviewed=now - timedelta(hours=2),
                total_reviews=1,
                correct_count=1,
                incorrect_count=0
            )
            db.add(study_record)
        
        # 5. Tạo Study Sessions mẫu
        # Session 1: Học set1
        session1 = models.StudySession(
            user_id=test_user.id,
            set_id=set1.id,
            cards_studied=7,
            cards_correct=6,
            cards_incorrect=1,
            duration_minutes=15,
            started_at=now - timedelta(days=2),
            completed_at=now - timedelta(days=2) + timedelta(minutes=15)
        )
        db.add(session1)
        
        # Session 2: Học set2
        session2 = models.StudySession(
            user_id=test_user.id,
            set_id=set2.id,
            cards_studied=3,
            cards_correct=3,
            cards_incorrect=0,
            duration_minutes=10,
            started_at=now - timedelta(hours=2),
            completed_at=now - timedelta(hours=2) + timedelta(minutes=10)
        )
        db.add(session2)
        
        # Session 3: Học lại set1
        session3 = models.StudySession(
            user_id=test_user.id,
            set_id=set1.id,
            cards_studied=5,
            cards_correct=5,
            cards_incorrect=0,
            duration_minutes=12,
            started_at=now - timedelta(days=1),
            completed_at=now - timedelta(days=1) + timedelta(minutes=12)
        )
        db.add(session3)
        
        # 6. Cập nhật Leaderboard với dữ liệu thực tế
        test_leaderboard.total_study_time = 37  # 15 + 10 + 12 minutes
        test_leaderboard.total_cards_studied = 15  # 7 + 3 + 5
        test_leaderboard.total_correct = 14  # 6 + 3 + 5
        test_leaderboard.streak_days = 3
        test_leaderboard.last_study_date = now - timedelta(hours=2)
        test_leaderboard.points = 150  # Điểm tính toán
        
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

