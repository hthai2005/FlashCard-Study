# 🐘 Hướng Dẫn Cài Đặt và Sử Dụng PostgreSQL

## 📋 Trả lời câu hỏi: "Cài PostgreSQL có cần mở hay gì không?"

**Có!** PostgreSQL cần chạy như một **service** (dịch vụ) trên Windows. Sau khi cài đặt, service sẽ tự động chạy, nhưng bạn cần đảm bảo nó đang hoạt động.

## 🚀 Các bước cài đặt PostgreSQL

### Bước 1: Download và cài đặt

1. **Download PostgreSQL:**
   - Truy cập: https://www.postgresql.org/download/windows/
   - Chọn "Download the installer"
   - Download file `.exe` (khoảng 200MB)

2. **Chạy installer:**
   - Double-click file `.exe` đã download
   - Chọn "Next" → "Next" → ...

3. **Cấu hình quan trọng:**
   - **Installation Directory**: Giữ mặc định (C:\Program Files\PostgreSQL\...)
   - **Data Directory**: Giữ mặc định
   - **Password**: Đặt password cho user `postgres` (NHỚ PASSWORD NÀY!)
     - Ví dụ: `postgres123` hoặc password bạn muốn
   - **Port**: Giữ mặc định `5432`
   - **Locale**: Giữ mặc định

4. **Hoàn tất cài đặt:**
   - Bỏ chọn "Launch Stack Builder" (không cần)
   - Click "Finish"

### Bước 2: Kiểm tra PostgreSQL Service

Sau khi cài đặt, PostgreSQL service sẽ tự động chạy. Kiểm tra:

**Cách 1: Qua Services (Windows)**
1. Nhấn `Win + R` → gõ `services.msc` → Enter
2. Tìm service tên: **"postgresql-x64-XX"** (XX là version)
3. Kiểm tra **Status** phải là **"Running"**
4. Nếu không chạy, click chuột phải → **Start**

**Cách 2: Qua Command Line**
```powershell
# Kiểm tra service
Get-Service -Name postgresql*

# Nếu không chạy, start service
Start-Service -Name postgresql-x64-16  # Thay số version của bạn
```

### Bước 3: Tạo Database

**Cách 1: Qua pgAdmin (GUI - Dễ dùng)**

1. Mở **pgAdmin 4** (đã được cài cùng PostgreSQL)
2. Kết nối:
   - Click chuột phải vào **"Servers"** → **"Create"** → **"Server"**
   - Tab **General**: Name: `Local PostgreSQL`
   - Tab **Connection**:
     - Host: `localhost`
     - Port: `5432`
     - Username: `postgres`
     - Password: password bạn đã đặt
   - Click **"Save"**

3. Tạo database:
   - Click chuột phải vào **"Databases"** → **"Create"** → **"Database"**
   - Database name: `flashcard_db`
   - Click **"Save"**

**Cách 2: Qua psql (Command Line)**

```powershell
# Mở psql
psql -U postgres

# Nhập password khi được hỏi
# Tạo database
CREATE DATABASE flashcard_db;

# Thoát
\q
```

### Bước 4: Cập nhật file .env

Mở file `backend/.env` và cập nhật:

```env
# Thay YOUR_PASSWORD bằng password bạn đã đặt khi cài PostgreSQL
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/flashcard_db
```

**Ví dụ:**
```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/flashcard_db
```

### Bước 5: Cài đặt psycopg2-binary

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install psycopg2-binary
```

### Bước 6: Test kết nối

```powershell
python test_postgres_connection.py
```

Nếu thành công, bạn sẽ thấy:
```
✅ Kết nối PostgreSQL thành công!
📊 PostgreSQL Version: PostgreSQL 16.x
📁 Database hiện tại: flashcard_db
```

### Bước 7: Tạo dữ liệu mẫu

```powershell
python seed_data.py
```

Nhập `yes` khi được hỏi.

## ✅ Kiểm tra yêu cầu công nghệ

### 1. ✅ FastAPI
- Đã có trong `backend/app/main.py`
- Đã cài đặt trong `requirements.txt`

### 2. ✅ PostgreSQL
- Đang chuyển đổi từ SQLite
- File `.env` đã được cập nhật
- `psycopg2-binary` đã có trong `requirements.txt`

### 3. ✅ Spaced Repetition Algorithm (SM-2)
- Đã có trong `backend/app/spaced_repetition.py`
- Sử dụng thuật toán SM-2 (SuperMemo 2)
- Đã tích hợp vào study system

## 🔍 Kiểm tra PostgreSQL đang chạy

**Mỗi lần sử dụng, đảm bảo PostgreSQL service đang chạy:**

```powershell
# Kiểm tra
Get-Service -Name postgresql*

# Nếu không chạy, start
Start-Service -Name postgresql-x64-16  # Thay version của bạn
```

Hoặc qua Services:
- `Win + R` → `services.msc` → Tìm `postgresql` → Start nếu chưa chạy

## 🐛 Troubleshooting

### Lỗi: "could not connect to server"
- **Nguyên nhân**: PostgreSQL service chưa chạy
- **Giải pháp**: Start service (xem Bước 2)

### Lỗi: "password authentication failed"
- **Nguyên nhân**: Password trong `.env` sai
- **Giải pháp**: Kiểm tra lại password trong `.env`

### Lỗi: "database does not exist"
- **Nguyên nhân**: Chưa tạo database `flashcard_db`
- **Giải pháp**: Tạo database (xem Bước 3)

### Lỗi: "psycopg2 not found"
- **Nguyên nhân**: Chưa cài `psycopg2-binary`
- **Giải pháp**: `pip install psycopg2-binary`

## 📝 Tóm tắt

1. ✅ Cài PostgreSQL → Service tự động chạy
2. ✅ Tạo database `flashcard_db`
3. ✅ Cập nhật `.env` với password đúng
4. ✅ Cài `psycopg2-binary`
5. ✅ Test kết nối
6. ✅ Chạy `seed_data.py`

**Lưu ý**: Mỗi lần khởi động máy, PostgreSQL service sẽ tự động chạy. Nếu tắt service, bạn cần start lại trước khi dùng ứng dụng.




