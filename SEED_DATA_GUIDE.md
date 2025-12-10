# 🌱 Hướng Dẫn Tạo Dữ Liệu Mẫu

## 📋 Tổng quan

Script `seed_data.py` sẽ tạo sẵn 2 tài khoản để bạn có thể test ứng dụng ngay:

1. **Admin user** - Tài khoản quản trị viên
2. **Test user** - Tài khoản người dùng thông thường

## 🚀 Cách sử dụng

### Bước 1: Đảm bảo đã setup backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
```

### Bước 2: Chạy script seed data

```powershell
python seed_data.py
```

Script sẽ hỏi xác nhận vì nó sẽ **XÓA toàn bộ dữ liệu hiện có** và tạo lại từ đầu.

Nhập `yes` hoặc `y` để tiếp tục.

### Bước 3: Kiểm tra kết quả

Sau khi chạy thành công, bạn sẽ thấy thông tin đăng nhập:

```
✅ Đã tạo dữ liệu mẫu thành công!

📋 Thông tin đăng nhập:
==================================================
👤 ADMIN:
   Username: admin
   Password: admin123
   Email: admin@example.com

👤 TEST USER:
   Username: testuser
   Password: test123
   Email: test@example.com
==================================================
```

## 🔑 Thông tin đăng nhập

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Email:** `admin@example.com`
- **Quyền:** Admin (có thể truy cập trang quản trị)

### Test User Account
- **Username:** `testuser`
- **Password:** `test123`
- **Email:** `test@example.com`
- **Quyền:** User thông thường

## 📝 Dữ liệu mẫu được tạo

1. **2 Users:**
   - Admin user (is_admin = True)
   - Test user (is_admin = False)

2. **Leaderboard entries** cho cả 2 users

3. **1 Flashcard Set mẫu** (thuộc test user):
   - Tên: "Từ vựng tiếng Anh cơ bản"
   - 5 flashcards mẫu về từ vựng tiếng Anh

## ⚠️ Lưu ý

- Script này sẽ **XÓA toàn bộ dữ liệu** trong database và tạo lại từ đầu
- Nếu đã có dữ liệu, script sẽ bỏ qua và không tạo lại
- Để tạo lại dữ liệu mẫu, xóa file `flashcard_app.db` và chạy lại script

## 🔄 Tạo lại dữ liệu mẫu

Nếu muốn reset và tạo lại dữ liệu mẫu:

```powershell
# Xóa database cũ
Remove-Item flashcard_app.db

# Chạy lại script
python seed_data.py
```

## ✅ Sau khi tạo dữ liệu mẫu

1. Chạy backend: `python run.py`
2. Chạy frontend: `npm run dev` (trong thư mục frontend)
3. Truy cập: http://localhost:3000
4. Đăng nhập với một trong 2 tài khoản trên

## 🎯 Test các tính năng

- **Với Admin:** Truy cập `/admin` để xem admin dashboard
- **Với Test User:** Có thể học flashcard set mẫu đã được tạo sẵn




