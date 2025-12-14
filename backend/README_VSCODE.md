# 🚀 Hướng Dẫn Chạy Project trong Visual Studio Code

## 📋 Bắt Đầu Nhanh

### 1. Mở Project trong VS Code

1. Mở VS Code
2. File → Open Folder → Chọn thư mục `flashcart-study`
3. VS Code sẽ tự động nhận diện Python project

### 2. Chọn Python Interpreter

1. Nhấn `Ctrl + Shift + P`
2. Gõ: `Python: Select Interpreter`
3. Chọn: `.\backend\venv\Scripts\python.exe`

Hoặc click vào Python version ở góc dưới bên phải → chọn interpreter từ venv.

### 3. Kết Nối PostgreSQL

👉 **Xem hướng dẫn chi tiết:** `HUONG_DAN_VSCODE_POSTGRESQL.md`

**Tóm tắt:**
1. Cấu hình file `.env` (đã có sẵn)
2. Tạo database `flashcard_db` trong PostgreSQL
3. Test kết nối: `python test_postgres_connection.py`
4. Tạo dữ liệu: `python seed_data.py`

### 4. Chạy Ứng Dụng

**Cách 1: Qua Terminal**
```powershell
cd backend
python run.py
```

**Cách 2: Qua Debug (F5)**
- Nhấn `F5` hoặc click **Run and Debug**
- Chọn **"Python: FastAPI"**

**Cách 3: Qua Command Palette**
- `Ctrl + Shift + P` → `Python: Run Python File in Terminal`
- Chọn file `run.py`

---

## 📁 Cấu Trúc Project

```
flashcart-study/
├── backend/              # Backend API (FastAPI)
│   ├── app/              # Application code
│   ├── .env              # Environment variables (PostgreSQL config)
│   ├── .vscode/          # VS Code settings
│   │   ├── settings.json # Python interpreter, env file
│   │   └── launch.json   # Debug configurations
│   ├── run.py            # Main entry point
│   └── requirements.txt  # Python dependencies
└── frontend/             # Frontend (React + Vite)
```

---

## ⚙️ File Cấu Hình Quan Trọng

### `.env` (Backend)
Cấu hình kết nối PostgreSQL:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flashcard_db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### `.vscode/settings.json`
Cấu hình VS Code:
- Python interpreter path
- Environment file (.env)
- Auto activate venv

### `.vscode/launch.json`
Cấu hình Debug:
- FastAPI launch configuration
- Test connection configuration
- Seed data configuration

---

## 🛠️ Các Lệnh Thường Dùng

### Terminal trong VS Code

```powershell
# Kích hoạt venv (nếu chưa tự động)
.\backend\venv\Scripts\Activate.ps1

# Test kết nối PostgreSQL
python backend/test_postgres_connection.py

# Tạo dữ liệu mẫu
python backend/seed_data.py

# Chạy server
python backend/run.py

# Cài đặt package mới
pip install package_name
```

---

## 🐛 Troubleshooting

### Lỗi: "Python interpreter not found"

**Giải pháp:**
1. `Ctrl + Shift + P` → `Python: Select Interpreter`
2. Chọn interpreter từ venv: `.\backend\venv\Scripts\python.exe`

### Lỗi: "ModuleNotFoundError"

**Giải pháp:**
```powershell
pip install -r backend/requirements.txt
```

### Lỗi: "PostgreSQL connection failed"

**Giải pháp:**
1. Kiểm tra PostgreSQL service đang chạy:
   ```powershell
   Get-Service -Name postgresql*
   ```
2. Kiểm tra file `.env` có đúng password không
3. Kiểm tra database `flashcard_db` đã được tạo chưa

### Lỗi: "DATABASE_URL not found"

**Giải pháp:**
- Kiểm tra file `.env` có trong thư mục `backend/`
- Kiểm tra `.vscode/settings.json` có cấu hình `python.envFile`

---

## 📚 Tài Liệu Tham Khảo

- `HUONG_DAN_VSCODE_POSTGRESQL.md` - Hướng dẫn chi tiết kết nối PostgreSQL
- `KET_NOI_POSTGRESQL_VSCODE.md` - Hướng dẫn nhanh PostgreSQL
- `HUONG_DAN_POSTGRESQL.md` - Hướng dẫn cài đặt PostgreSQL
- `CHUYEN_SANG_POSTGRESQL.md` - Chuyển từ SQLite sang PostgreSQL

---

## ✅ Checklist

- [ ] VS Code đã mở project
- [ ] Python interpreter đã chọn từ venv
- [ ] PostgreSQL đã cài đặt và service đang chạy
- [ ] File `.env` đã được cấu hình
- [ ] Database `flashcard_db` đã được tạo
- [ ] Test kết nối thành công
- [ ] Dữ liệu mẫu đã được tạo
- [ ] Ứng dụng chạy thành công

---

**Chúc bạn code vui vẻ! 🎉**

