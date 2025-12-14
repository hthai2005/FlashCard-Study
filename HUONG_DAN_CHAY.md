# 🚀 Hướng Dẫn Chạy Dự Án Flashcard Study App

## 📋 Yêu cầu hệ thống

- **Python 3.9+** (đã có venv với Python 3.14)
- **Node.js 16+** và npm
- **Git** (đã có source code)

## ⚡ Quick Start - Chạy nhanh

### Bước 1: Setup Backend (Python/FastAPI)

1. **Mở terminal và di chuyển vào thư mục backend:**
```bash
cd backend
```

2. **Kích hoạt virtual environment (đã có sẵn):**
```bash
# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Hoặc Windows CMD:
venv\Scripts\activate.bat
```

3. **Cài đặt dependencies (nếu chưa có):**
```bash
pip install -r requirements.txt
```

4. **Tạo file `.env` trong thư mục backend:**
```bash
# Tạo file .env với nội dung:
```

Tạo file `.env` với nội dung sau:
```env
# Database - dùng SQLite cho development (đơn giản, không cần cài PostgreSQL)
DATABASE_URL=sqlite:///./flashcard_app.db

# Secret key cho JWT (tạo một chuỗi ngẫu nhiên)
SECRET_KEY=your-super-secret-key-change-this-in-production-12345

# OpenAI API Key (optional - chỉ cần nếu dùng tính năng AI generate)
# OPENAI_API_KEY=sk-your-api-key-here
```

5. **Chạy backend server:**
```bash
python run.py
```

Hoặc:
```bash
uvicorn app.main:app --reload
```

✅ **Backend sẽ chạy tại:** `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

---

### Bước 2: Setup Frontend (React/Vite)

1. **Mở terminal mới và di chuyển vào thư mục frontend:**
```bash
cd frontend
```

2. **Cài đặt dependencies:**
```bash
npm install
```

3. **Chạy development server:**
```bash
npm run dev
```

✅ **Frontend sẽ chạy tại:** `http://localhost:3000`

---

## 🎯 Truy cập ứng dụng

Sau khi chạy cả backend và frontend:

- **Frontend (Giao diện người dùng):** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation (Swagger):** http://localhost:8000/docs

---

## 📝 Tạo tài khoản đầu tiên

1. Mở trình duyệt và truy cập: `http://localhost:3000/register`
2. Điền thông tin để tạo tài khoản mới
3. Đăng nhập và bắt đầu sử dụng!

---

## 🔧 Cấu hình nâng cao

### Sử dụng PostgreSQL thay vì SQLite

1. Cài đặt PostgreSQL
2. Tạo database:
```sql
CREATE DATABASE flashcard_db;
```

3. Cập nhật file `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/flashcard_db
```

4. Cài đặt driver PostgreSQL:
```bash
pip install psycopg2-binary
```

### Bật tính năng AI Generate

1. Lấy API key từ: https://platform.openai.com/
2. Thêm vào file `.env`:
```env
OPENAI_API_KEY=sk-your-api-key-here
```

---

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "Module not found"
- Đảm bảo đã kích hoạt virtual environment
- Chạy lại: `pip install -r requirements.txt`

### Lỗi: "Port already in use"
- Backend: Đổi port trong `run.py` hoặc dùng: `uvicorn app.main:app --port 8001`
- Frontend: Đổi port trong `vite.config.js`

### Lỗi: "Cannot connect to API"
- Kiểm tra backend đã chạy chưa
- Kiểm tra CORS settings trong `backend/app/main.py`
- Kiểm tra proxy trong `frontend/vite.config.js`

### Lỗi database
- Xóa file `flashcard_app.db` và chạy lại (sẽ tự tạo lại)
- Kiểm tra `DATABASE_URL` trong file `.env`

---

## 📚 Cấu trúc dự án

```
flashcart-study/
├── backend/              # Backend API (FastAPI)
│   ├── app/
│   │   ├── main.py      # Entry point
│   │   ├── database.py  # Database config
│   │   └── routers/     # API routes
│   ├── run.py           # Script chạy server
│   ├── requirements.txt # Python dependencies
│   └── .env             # Environment variables (tự tạo)
│
└── frontend/            # Frontend (React + Vite)
    ├── src/
    │   ├── pages/       # Các trang
    │   ├── components/  # Components
    │   └── services/    # API services
    ├── package.json     # Node dependencies
    └── vite.config.js   # Vite config
```

---

## ✅ Checklist chạy dự án

- [ ] Backend: Kích hoạt venv và cài dependencies
- [ ] Backend: Tạo file `.env` với DATABASE_URL và SECRET_KEY
- [ ] Backend: Chạy `python run.py` → chạy tại port 8000
- [ ] Frontend: Chạy `npm install`
- [ ] Frontend: Chạy `npm run dev` → chạy tại port 3000
- [ ] Mở browser: http://localhost:3000
- [ ] Tạo tài khoản và đăng nhập

---

## 🎉 Hoàn thành!

Bây giờ bạn đã có thể sử dụng ứng dụng Flashcard Study App!

**Lưu ý:** 
- Giữ cả 2 terminal chạy (1 cho backend, 1 cho frontend)
- Backend phải chạy trước khi frontend kết nối
- Database SQLite sẽ tự động tạo khi chạy lần đầu









