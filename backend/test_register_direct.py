"""
Test tạo tài khoản và xem lỗi chi tiết
"""
import requests
import json
import traceback

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("🧪 Test Tạo Tài Khoản - Chi Tiết")
print("=" * 60)

# Test tạo tài khoản
new_username = "testuser_new"
new_email = "testuser_new@example.com"

print(f"\n📝 Tạo tài khoản:")
print(f"   Username: {new_username}")
print(f"   Email: {new_email}")
print(f"   Password: test123")

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
    
    print(f"\n📊 Response:")
    print(f"   Status Code: {response.status_code}")
    print(f"   Headers: {dict(response.headers)}")
    print(f"   Response Text: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Thành công!")
        print(f"   Data: {json.dumps(data, indent=2, default=str)}")
    else:
        print(f"\n❌ Thất bại!")
        try:
            error_data = response.json()
            print(f"   Error JSON: {json.dumps(error_data, indent=2)}")
        except:
            print(f"   Error Text: {response.text}")
            
except Exception as e:
    print(f"\n❌ Exception: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)

