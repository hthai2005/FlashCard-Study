# 🐘 Hướng Dẫn Chuyển Đổi Từ SQLite Sang PostgreSQL

## 📋 Yêu cầu

1. **PostgreSQL đã được cài đặt** trên máy
2. **Python package**: `psycopg2-binary` (sẽ cài đặt ở bước 2)

## 🚀 Các bước thực hiện

### Bước 1: Cài đặt PostgreSQL (nếu chưa có)

**Windows:**
- Tải từ: https://www.postgresql.org/download/windows/
- Hoặc dùng installer: https://www.postgresql.org/download/windows/installer/
- Trong quá trình cài đặt, ghi nhớ:
  - **Port**: 5432 (mặc định)
  - **Username**: postgres (mặc định)
  - **Password**: (bạn tự đặt)

**Hoặc dùng Docker:**
```bash
docker run --name postgres-flashcard -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=flashcard_db -p 5432:5432 -d postgres
```

### Bước 2: Cài đặt psycopg2-binary

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install psycopg2-binary
```

### Bước 3: Tạo Database trong PostgreSQL

**Cách 1: Dùng pgAdmin (GUI)**
1. Mở pgAdmin
2. Kết nối với PostgreSQL server
3. Right-click vào "Databases" → "Create" → "Database"
4. Tên database: `flashcard_db`
5. Click "Save"

**Cách 2: Dùng psql (Command Line)**
```bash
# Kết nối PostgreSQL
psql -U postgres

# Tạo database
CREATE DATABASE flashcard_db;

# Thoát
\q
```

**Cách 3: Dùng PowerShell**
```powershell
# Nếu PostgreSQL đã được thêm vào PATH
psql -U postgres -c "CREATE DATABASE flashcard_db;"
```

### Bước 4: Cập nhật file .env

Mở file `backend/.env` và cập nhật `DATABASE_URL`:

```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/flashcard_db

# Hoặc nếu username khác:
# DATABASE_URL=postgresql://username:password@localhost:5432/flashcard_db
```

**Format:** `postgresql://username:password@host:port/database_name`

### Bước 5: Xóa file SQLite cũ (tùy chọn)

```powershell
# Backup trước nếu cần
# Copy flashcard_app.db sang nơi khác

# Xóa file SQLite
Remove-Item flashcard_app.db -ErrorAction SilentlyContinue
```

### Bước 6: Tạo lại database và dữ liệu mẫu

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python seed_data.py
```

Nhập `yes` khi được hỏi.

### Bước 7: Kiểm tra kết nối

```powershell
python test_auth.py
```

Hoặc test trong pgAdmin:
- Mở pgAdmin
- Kết nối với database `flashcard_db`
- Xem bảng `users` có dữ liệu không

## ✅ Kiểm tra thành công

Nếu mọi thứ OK, bạn sẽ thấy:
- `python seed_data.py` chạy thành công
- `python test_auth.py` hiển thị users
- Backend có thể kết nối và query database

## 🔧 Troubleshooting

### Lỗi: "could not connect to server"

**Nguyên nhân:** PostgreSQL service chưa chạy

**Giải pháp:**
```powershell
# Windows: Mở Services (services.msc)
# Tìm "postgresql-x64-XX" và Start service

# Hoặc dùng PowerShell (Admin):
Start-Service postgresql-x64-16
```

### Lỗi: "password authentication failed"

**Nguyên nhân:** Sai password trong DATABASE_URL

**Giải pháp:** Kiểm tra lại password trong file `.env`

### Lỗi: "database does not exist"

**Nguyên nhân:** Database chưa được tạo

**Giải pháp:** Chạy lại Bước 3 để tạo database

### Lỗi: "module 'psycopg2' has no attribute 'connect'"

**Nguyên nhân:** psycopg2-binary chưa được cài đặt

**Giải pháp:**
```powershell
pip install psycopg2-binary
```

## 📝 Lưu ý

- **Backup dữ liệu SQLite** trước khi chuyển đổi (nếu có dữ liệu quan trọng)
- **Port mặc định** của PostgreSQL là 5432
- **Username mặc định** là `postgres`
- **Password** là password bạn đặt khi cài PostgreSQL

## 🔄 Quay lại SQLite (nếu cần)

Nếu muốn quay lại SQLite, chỉ cần cập nhật `.env`:
```env
DATABASE_URL=sqlite:///./flashcard_app.db
```

