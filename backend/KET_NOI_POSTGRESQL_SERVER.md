# 🐘 Hướng Dẫn Kết Nối Backend với PostgreSQL trên Server

## 📋 Yêu cầu

1. **PostgreSQL đã được cài đặt và chạy trên server**
2. **psycopg2-binary** đã được cài đặt (có trong requirements.txt)
3. **Thông tin kết nối PostgreSQL server:**
   - Host/IP của server
   - Port (mặc định: 5432)
   - Username
   - Password
   - Database name

## 🚀 Các bước thực hiện

### Bước 1: Tạo file .env trong thư mục backend

Tạo file `backend/.env` với nội dung:

```env
# PostgreSQL Database Configuration
# Format: postgresql://username:password@host:port/database_name

# Ví dụ kết nối server remote:
DATABASE_URL=postgresql://username:password@your-server-ip:5432/flashcard_db

# Nếu server yêu cầu SSL:
# DATABASE_URL=postgresql://username:password@your-server-ip:5432/flashcard_db?sslmode=require

# JWT Secret Key (tạo key ngẫu nhiên cho production)
SECRET_KEY=your-secret-key-here-change-in-production

# JWT Algorithm
ALGORITHM=HS256

# Access Token Expire (minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Lưu ý:** Thay thế các giá trị sau:
- `username`: Tên user PostgreSQL trên server
- `password`: Mật khẩu của user
- `your-server-ip`: Địa chỉ IP hoặc domain của server
- `5432`: Port PostgreSQL (mặc định là 5432)
- `flashcard_db`: Tên database (tạo database này trên server trước)

### Bước 2: Tạo Database trên PostgreSQL Server

Kết nối vào PostgreSQL server và tạo database:

```sql
-- Kết nối PostgreSQL (từ máy local hoặc server)
psql -U postgres -h your-server-ip

-- Tạo database
CREATE DATABASE flashcard_db;

-- (Optional) Tạo user riêng cho ứng dụng
CREATE USER flashcard_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE flashcard_db TO flashcard_user;

-- Thoát
\q
```

### Bước 3: Cấu hình Firewall trên Server (nếu cần)

Nếu server có firewall, mở port PostgreSQL:

```bash
# Ubuntu/Debian
sudo ufw allow 5432/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

### Bước 4: Cấu hình PostgreSQL để cho phép kết nối từ xa

Trên server PostgreSQL, chỉnh sửa file `postgresql.conf`:

```bash
# Tìm và sửa:
listen_addresses = '*'  # Hoặc IP cụ thể
```

Chỉnh sửa file `pg_hba.conf` để cho phép kết nối từ xa:

```
# Thêm dòng này (thay your-client-ip bằng IP máy client hoặc 0.0.0.0/0 cho tất cả)
host    all             all             your-client-ip/32         md5
```

Sau đó restart PostgreSQL service:

```bash
# Ubuntu/Debian
sudo systemctl restart postgresql

# CentOS/RHEL
sudo systemctl restart postgresql
```

### Bước 5: Kiểm tra kết nối

Chạy script test kết nối:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python test_postgres_connection.py
```

### Bước 6: Tạo database tables và dữ liệu mẫu

```powershell
# Tạo tables và seed data
python seed_data.py
```

Nhập `yes` khi được hỏi.

### Bước 7: Chạy backend

```powershell
python run.py
```

Hoặc:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## ✅ Kiểm tra thành công

Nếu mọi thứ OK, bạn sẽ thấy:
- `python test_postgres_connection.py` hiển thị "✅ Kết nối PostgreSQL thành công!"
- `python seed_data.py` chạy thành công
- Backend có thể kết nối và query database từ server

## 🔧 Troubleshooting

### Lỗi: "could not connect to server"

**Nguyên nhân:** 
- PostgreSQL service chưa chạy trên server
- Firewall chặn port 5432
- PostgreSQL chưa được cấu hình để lắng nghe kết nối từ xa

**Giải pháp:**
1. Kiểm tra PostgreSQL service đang chạy: `sudo systemctl status postgresql`
2. Kiểm tra firewall: `sudo ufw status` hoặc `sudo firewall-cmd --list-all`
3. Kiểm tra `postgresql.conf` và `pg_hba.conf`

### Lỗi: "password authentication failed"

**Nguyên nhân:** Sai password trong DATABASE_URL

**Giải pháp:** Kiểm tra lại password trong file `.env`

### Lỗi: "database does not exist"

**Nguyên nhân:** Database chưa được tạo trên server

**Giải pháp:** Chạy lại Bước 2 để tạo database

### Lỗi: "connection timeout"

**Nguyên nhân:** 
- Server không cho phép kết nối từ IP của bạn
- Firewall chặn

**Giải pháp:**
1. Kiểm tra `pg_hba.conf` đã cấu hình đúng chưa
2. Kiểm tra firewall trên server
3. Kiểm tra network connectivity: `ping your-server-ip`

## 📝 Lưu ý bảo mật

1. **Không commit file `.env`** vào git (đã có trong .gitignore)
2. **Sử dụng SSL** cho kết nối production: thêm `?sslmode=require` vào DATABASE_URL
3. **Tạo user riêng** cho ứng dụng thay vì dùng postgres user
4. **Giới hạn IP** có thể kết nối trong `pg_hba.conf`
5. **Sử dụng password mạnh** cho database user

## 🔄 Format DATABASE_URL

```
postgresql://[username]:[password]@[host]:[port]/[database_name]
```

Ví dụ:
```
postgresql://flashcard_user:mypassword123@192.168.1.100:5432/flashcard_db
postgresql://postgres:admin123@example.com:5432/flashcard_db?sslmode=require
```







