"""
Script test để kiểm tra authentication và database
"""
from app.database import SessionLocal
from app import models, auth

def test_database():
    db = SessionLocal()
    try:
        # Kiểm tra số lượng users
        user_count = db.query(models.User).count()
        print(f"📊 Số lượng users trong database: {user_count}")
        
        if user_count == 0:
            print("❌ Không có user nào trong database!")
            print("💡 Hãy chạy: python seed_data.py")
            return False
        
        # Kiểm tra từng user
        users = db.query(models.User).all()
        for user in users:
            print(f"\n👤 User: {user.username}")
            print(f"   Email: {user.email}")
            print(f"   Is Admin: {user.is_admin}")
            print(f"   Is Active: {user.is_active}")
            
            # Test password verification
            if user.username == "admin":
                test_password = "admin123"
            elif user.username == "testuser":
                test_password = "test123"
            else:
                test_password = None
            
            if test_password:
                is_valid = auth.verify_password(test_password, user.hashed_password)
                print(f"   Password verification: {'✅ Valid' if is_valid else '❌ Invalid'}")
        
        return True
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🔍 Kiểm tra database và authentication...")
    print("=" * 50)
    test_database()




