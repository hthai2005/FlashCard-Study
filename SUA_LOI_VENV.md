# 🔧 Hướng Dẫn Sửa Lỗi Virtual Environment

## ❌ Lỗi gặp phải:
```
Fatal error in launcher: Unable to create process using 
'"C:\Users\mrtha\OneDrive\Documents\PTUD\backend\venv\Scripts\python.exe"'
```

**Nguyên nhân:** Virtual environment đang trỏ đến đường dẫn cũ (PTUD) thay vì đường dẫn hiện tại (flashcart-study).

## ✅ Cách sửa:

### Bước 1: Xóa virtual environment cũ

Mở PowerShell trong thư mục `backend` và chạy:

```powershell
# Di chuyển vào thư mục backend
cd backend

# Xóa thư mục venv cũ
Remove-Item -Recurse -Force venv
```

### Bước 2: Tạo lại virtual environment mới

```powershell
# Tạo venv mới
python -m venv venv
```

### Bước 3: Kích hoạt virtual environment

```powershell
# Kích hoạt venv
.\venv\Scripts\Activate.ps1
```

**Lưu ý:** Nếu gặp lỗi "execution of scripts is disabled", chạy lệnh này trước:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Bước 4: Cài đặt dependencies

```powershell
# Cài đặt các package cần thiết
pip install -r requirements.txt
```

### Bước 5: Tạo file .env

Tạo file `.env` trong thư mục `backend` với nội dung:

```env
DATABASE_URL=sqlite:///./flashcard_app.db
SECRET_KEY=your-super-secret-key-change-this-12345
```

### Bước 6: Chạy backend

```powershell
python run.py
```

---

## 📝 Tóm tắt các lệnh (copy/paste):

```powershell
# 1. Xóa venv cũ
cd backend
Remove-Item -Recurse -Force venv

# 2. Tạo venv mới
python -m venv venv

# 3. Kích hoạt venv
.\venv\Scripts\Activate.ps1

# 4. Cài đặt dependencies
pip install -r requirements.txt

# 5. Tạo file .env (dùng Notepad hoặc VS Code)
# Tạo file .env với nội dung:
# DATABASE_URL=sqlite:///./flashcard_app.db
# SECRET_KEY=your-super-secret-key-change-this-12345

# 6. Chạy server
python run.py
```

---

## 🎯 Kiểm tra đã thành công:

Sau khi chạy `python run.py`, bạn sẽ thấy:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

Truy cập: http://localhost:8000/docs để xem API documentation.




