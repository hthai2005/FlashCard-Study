"""
Script test trực tiếp đăng nhập và tạo tài khoản
"""
import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("🧪 Test Đăng Nhập và Tạo Tài Khoản")
print("=" * 60)

# Test 1: Đăng nhập Admin
print("\n1️⃣  Test Đăng Nhập Admin...")
try:
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "admin", "password": "admin123"},
        timeout=5
    )
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Đăng nhập thành công!")
        print(f"   Token: {data.get('access_token', '')[:50]}...")
    else:
        print(f"   ❌ Đăng nhập thất bại!")
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"   ❌ Lỗi: {e}")

# Test 2: Đăng nhập Test User
print("\n2️⃣  Test Đăng Nhập Test User...")
try:
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "testuser", "password": "test123"},
        timeout=5
    )
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Đăng nhập thành công!")
        print(f"   Token: {data.get('access_token', '')[:50]}...")
    else:
        print(f"   ❌ Đăng nhập thất bại!")
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"   ❌ Lỗi: {e}")

# Test 3: Tạo tài khoản mới
print("\n3️⃣  Test Tạo Tài Khoản Mới...")
import random
new_username = f"testuser_{random.randint(1000, 9999)}"
new_email = f"{new_username}@example.com"

try:
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "username": new_username,
            "email": new_email,
            "password": "test123"
        },
        timeout=5
    )
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Tạo tài khoản thành công!")
        print(f"   Username: {data.get('username')}")
        print(f"   Email: {data.get('email')}")
    else:
        print(f"   ❌ Tạo tài khoản thất bại!")
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"   ❌ Lỗi: {e}")

# Test 4: Kiểm tra password hash
print("\n4️⃣  Kiểm Tra Password Hash...")
try:
    from app.database import SessionLocal
    from app import models, auth
    
    db = SessionLocal()
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    
    if admin_user:
        print(f"   Username: {admin_user.username}")
        print(f"   Password Hash: {admin_user.hashed_password[:50]}...")
        
        # Test verify password
        is_valid = auth.verify_password("admin123", admin_user.hashed_password)
        print(f"   Verify 'admin123': {is_valid}")
        
        is_invalid = auth.verify_password("wrong", admin_user.hashed_password)
        print(f"   Verify 'wrong': {is_invalid}")
    else:
        print("   ❌ Không tìm thấy user admin")
    
    db.close()
except Exception as e:
    print(f"   ❌ Lỗi: {e}")

print("\n" + "=" * 60)
print("✅ Test hoàn tất!")
print("=" * 60)

