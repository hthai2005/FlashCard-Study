# 🚀 Hướng Dẫn Deploy

## Backend - Render

### Bước 1: Tạo PostgreSQL Database
1. Vào https://dashboard.render.com
2. Chọn "New +" → "PostgreSQL"
3. Đặt tên: `flashcard-db`
4. Chọn plan: Free
5. Click "Create Database"
6. Copy **Internal Database URL** (sẽ dùng sau)

### Bước 2: Deploy Web Service
1. Chọn "New +" → "Web Service"
2. Connect GitHub repository: `flashcart-study`
3. Cấu hình:
   - **Name**: `flashcard-backend`
   - **Root Directory**: `backend` ⚠️ QUAN TRỌNG
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   - `DATABASE_URL`: Paste Internal Database URL từ bước 1
   - `SECRET_KEY`: Tạo ngẫu nhiên (dùng: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
   - `OPENAI_API_KEY`: (Optional) Nếu cần AI generation
5. Click "Create Web Service"
6. Đợi deploy xong, copy URL backend (ví dụ: `https://flashcard-backend.onrender.com`)

### Bước 3: Kiểm tra Backend
- Health check: `https://[backend-url]/api/health`
- API docs: `https://[backend-url]/docs`

---

## Frontend - Vercel

### Bước 1: Deploy
1. Vào https://vercel.com
2. Chọn "Add New..." → "Project"
3. Import Git repository: `flashcart-study`
4. Cấu hình:
   - **Framework Preset**: Vite (tự động detect)
   - **Root Directory**: `frontend` ⚠️ QUAN TRỌNG
   - **Build Command**: `npm run build` (tự động)
   - **Output Directory**: `dist` (tự động)
5. Environment Variables:
   - `VITE_API_URL`: `https://[backend-url].onrender.com` (URL từ Render)
6. Click "Deploy"
7. Đợi deploy xong, copy URL frontend (ví dụ: `https://flashcard-app.vercel.app`)

### Bước 2: Cập nhật CORS trên Backend
1. Mở `backend/app/main.py`
2. Tìm phần CORS middleware (dòng ~168)
3. Thêm URL Vercel vào `allow_origins`:
   ```python
   allow_origins=[
       # ... các URL localhost ...
       "https://flashcard-app.vercel.app",  # URL Vercel của bạn
   ],
   ```
4. Commit và push lại code
5. Render sẽ tự động redeploy

### Bước 3: Kiểm tra Frontend
- Truy cập URL Vercel
- Mở DevTools (F12) → Console, không có lỗi
- Thử đăng nhập/đăng ký
- Kiểm tra Network tab, API calls thành công

---

## ⚠️ Lưu ý Quan Trọng

1. **Root Directory**: Phải đúng `backend` và `frontend`
2. **Environment Variables**: Phải thêm đầy đủ
3. **CORS**: Phải cập nhật sau khi có URL Vercel
4. **Database URL**: Dùng Internal Database URL (không phải External)
5. **Static Files**: Render free tier không lưu file uploads lâu dài

---

## 🔧 Troubleshooting

### Backend không kết nối database
- Kiểm tra `DATABASE_URL` dùng Internal URL
- Xem logs trên Render Dashboard

### CORS Error
- Kiểm tra đã thêm URL Vercel vào CORS chưa
- Redeploy backend sau khi sửa

### Frontend không gọi được API
- Kiểm tra `VITE_API_URL` trong Vercel Dashboard
- Rebuild frontend sau khi thêm env variable

---

## ✅ Checklist

- [ ] Backend deployed trên Render
- [ ] Database connected thành công
- [ ] Frontend deployed trên Vercel
- [ ] Environment variables đã thêm đầy đủ
- [ ] CORS đã cập nhật với URL Vercel
- [ ] Test đăng nhập/đăng ký thành công
- [ ] Test các chức năng chính hoạt động






