# 🐘 Hướng Dẫn Chuyển Từ SQLite Sang PostgreSQL

## 📋 Yêu cầu

1. **Cài đặt PostgreSQL** trên máy (nếu chưa có)
   - Download tại: https://www.postgresql.org/download/windows/
   - Hoặc dùng PostgreSQL từ Docker

2. **Cài đặt psycopg2-binary** (đã có trong requirements.txt)

## 🚀 Các bước thực hiện

### Bước 1: Cài đặt PostgreSQL (nếu chưa có)

1. Download và cài đặt PostgreSQL từ: https://www.postgresql.org/download/windows/
2. Trong quá trình cài đặt, nhớ:
   - **Port**: 5432 (mặc định)
   - **Username**: postgres (mặc định)
   - **Password**: đặt password cho user postgres (nhớ password này!)

### Bước 2: Tạo Database

Mở **pgAdmin** hoặc **psql** và chạy:

```sql
-- Tạo database mới
CREATE DATABASE flashcard_db;

-- (Optional) Tạo user riêng cho ứng dụng
CREATE USER flashcard_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE flashcard_db TO flashcard_user;
```

Hoặc dùng psql command line:

```bash
# Kết nối PostgreSQL
psql -U postgres

# Tạo database
CREATE DATABASE flashcard_db;

# Thoát
\q
```

### Bước 3: Cập nhật file .env

Mở file `backend/.env` và cập nhật `DATABASE_URL`:

```env
# Thay đổi từ SQLite:
# DATABASE_URL=sqlite:///./flashcard_app.db

# Sang PostgreSQL:
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/flashcard_db

# Hoặc nếu dùng user riêng:
# DATABASE_URL=postgresql://flashcard_user:your_password@localhost:5432/flashcard_db
```

**Format:** `postgresql://username:password@host:port/database_name`

### Bước 4: Cài đặt psycopg2-binary

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install psycopg2-binary
```

### Bước 5: Tạo lại database và dữ liệu mẫu

```powershell
# Tạo lại database với PostgreSQL
python seed_data.py
```

Nhập `yes` khi được hỏi.

### Bước 6: Kiểm tra kết nối

```powershell
# Test kết nối
python test_auth.py
```

## 🔍 Kiểm tra Database

Sau khi chạy seed_data, kiểm tra trong PostgreSQL:

```sql
-- Kết nối database
\c flashcard_db

-- Xem danh sách tables
\dt

-- Xem users
SELECT * FROM users;

-- Xem flashcard sets
SELECT * FROM flashcard_sets;
```

## ⚠️ Lưu ý

1. **Backup dữ liệu SQLite** (nếu có dữ liệu quan trọng):
   ```powershell
   Copy-Item flashcard_app.db flashcard_app.db.backup
   ```

2. **Xóa file SQLite cũ** (sau khi đã chuyển xong):
   ```powershell
   Remove-Item flashcard_app.db
   ```

3. **Port mặc định PostgreSQL**: 5432
4. **Host mặc định**: localhost

## 🐛 Troubleshooting

### Lỗi: "could not connect to server"

- Kiểm tra PostgreSQL service đã chạy chưa:
  - Windows: Services → PostgreSQL
  - Hoặc: `pg_ctl status`

### Lỗi: "password authentication failed"

- Kiểm tra lại password trong `.env`
- Đảm bảo username và password đúng

### Lỗi: "database does not exist"

- Tạo database trước:
  ```sql
  CREATE DATABASE flashcard_db;
  ```

## ✅ Sau khi chuyển xong

1. Database sẽ lưu trong PostgreSQL thay vì file SQLite
2. Dữ liệu sẽ được lưu trữ an toàn hơn
3. Có thể dễ dàng scale và backup




