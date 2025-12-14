"""
Script test đăng nhập và tạo tài khoản
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login(username, password):
    """Test đăng nhập"""
    print(f"\n🔐 Đang đăng nhập với username: {username}...")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": username, "password": password}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Đăng nhập thành công!")
        print(f"   Token: {data['access_token'][:50]}...")
        return data['access_token']
    else:
        print(f"❌ Đăng nhập thất bại: {response.status_code}")
        print(f"   {response.text}")
        return None

def test_register(username, email, password):
    """Test tạo tài khoản"""
    print(f"\n✨ Đang tạo tài khoản: {username}...")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Tạo tài khoản thành công!")
        print(f"   Username: {data['username']}")
        print(f"   Email: {data['email']}")
        print(f"   ID: {data['id']}")
        return True
    else:
        print(f"❌ Tạo tài khoản thất bại: {response.status_code}")
        print(f"   {response.text}")
        return False

def test_get_me(token):
    """Test lấy thông tin user hiện tại"""
    print(f"\n👤 Đang lấy thông tin user...")
    
    response = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Lấy thông tin thành công!")
        print(f"   Username: {data['username']}")
        print(f"   Email: {data['email']}")
        print(f"   Admin: {data.get('is_admin', False)}")
        return data
    else:
        print(f"❌ Lấy thông tin thất bại: {response.status_code}")
        print(f"   {response.text}")
        return None

def main():
    print("=" * 60)
    print("🧪 Test Đăng Nhập và Tạo Tài Khoản")
    print("=" * 60)
    
    # Test 1: Đăng nhập Admin
    admin_token = test_login("admin", "admin123")
    if admin_token:
        test_get_me(admin_token)
    
    # Test 2: Đăng nhập Test User
    test_token = test_login("testuser", "test123")
    if test_token:
        test_get_me(test_token)
    
    # Test 3: Tạo tài khoản mới
    import random
    new_username = f"user_{random.randint(1000, 9999)}"
    new_email = f"{new_username}@example.com"
    if test_register(new_username, new_email, "password123"):
        # Đăng nhập với tài khoản mới
        new_token = test_login(new_username, "password123")
        if new_token:
            test_get_me(new_token)
    
    print("\n" + "=" * 60)
    print("✅ Test hoàn tất!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("❌ Không thể kết nối đến server!")
        print("💡 Đảm bảo server đang chạy: python run.py")
    except Exception as e:
        print(f"❌ Lỗi: {e}")

