# 📚 Flashcard Study App

Ứng dụng học từ vựng với thuật toán Spaced Repetition (SM-2), giúp bạn học hiệu quả hơn thông qua việc lặp lại có khoảng cách.

## ✨ Tính năng

### Tính năng cơ bản
- ✅ Tạo và quản lý bộ flashcard
- ✅ Học với flip card animation
- ✅ Theo dõi tiến độ học tập
- ✅ Thuật toán Spaced Repetition (SM-2)
- ✅ Biểu đồ tiến độ hàng tuần
- ✅ Mục tiêu học tập hàng ngày
- ✅ Streak tracking

### Tính năng nâng cao
- ✅ Import flashcards từ file (CSV/JSON)
- ✅ AI generate questions (sử dụng OpenAI)
- ✅ Leaderboard với ranking system
- ✅ JWT Authentication
- ✅ Public/Private flashcard sets

## 🛠️ Công nghệ sử dụng

### Backend
- **FastAPI** - Web framework
- **PostgreSQL/SQLite** - Database
- **SQLAlchemy** - ORM
- **Pydantic** - Data validation
- **JWT** - Authentication
- **OpenAI API** - AI generation

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Charts
- **Axios** - HTTP client

## 📦 Cài đặt

### Backend

1. Di chuyển vào thư mục backend:
```bash
cd backend
```

2. Tạo virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. Cài đặt dependencies:
```bash
pip install -r requirements.txt
```

4. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

5. Cấu hình database trong `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/flashcard_db
# Hoặc dùng SQLite cho development:
# DATABASE_URL=sqlite:///./flashcard_app.db
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key-here
```

6. Chạy server:
```bash
uvicorn app.main:app --reload
```

Backend sẽ chạy tại `http://localhost:8000`

### Frontend

1. Di chuyển vào thư mục frontend:
```bash
cd frontend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` (optional):
```env
VITE_API_URL=http://localhost:8000
```

4. Chạy development server:
```bash
npm run dev
```

Frontend sẽ chạy tại `http://localhost:3000`

## 🚀 Deployment

### Backend trên Render

1. Tạo PostgreSQL database trên Render
2. Tạo Web Service mới
3. Kết nối GitHub repository
4. Cấu hình:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**: Thêm các biến từ `.env`

### Frontend trên Vercel

1. Kết nối GitHub repository với Vercel
2. Cấu hình:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**: `VITE_API_URL=https://your-render-backend.onrender.com`

## 📁 Cấu trúc dự án

```
.
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── spaced_repetition.py
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── flashcards.py
│   │       ├── study.py
│   │       ├── leaderboard.py
│   │       └── ai.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Thông tin user hiện tại

### Flashcards
- `GET /api/flashcards/sets` - Lấy danh sách sets
- `POST /api/flashcards/sets` - Tạo set mới
- `GET /api/flashcards/sets/{id}` - Lấy chi tiết set
- `POST /api/flashcards/sets/{id}/cards` - Thêm flashcard
- `PUT /api/flashcards/cards/{id}` - Cập nhật flashcard
- `DELETE /api/flashcards/cards/{id}` - Xóa flashcard

### Study
- `GET /api/study/sets/{id}/due` - Lấy cards cần review
- `POST /api/study/answer` - Gửi câu trả lời
- `GET /api/study/progress/{id}` - Lấy tiến độ học tập
- `POST /api/study/sessions` - Tạo session mới
- `PUT /api/study/sessions/{id}` - Hoàn thành session

### AI & Import
- `POST /api/ai/generate` - Generate flashcards bằng AI (Trong giai đoạn phát triển)
- `POST /api/ai/import` - Import từ file

### Leaderboard
- `GET /api/leaderboard/` - Lấy leaderboard
- `GET /api/leaderboard/my-rank` - Lấy rank của user

## 🧪 Testing

### Test API với Swagger UI
Truy cập `http://localhost:8000/docs` để xem và test API

## 📝 Notes

- Thuật toán Spaced Repetition sử dụng SM-2 algorithm
- Quality rating: 0-1 (incorrect), 2-3 (difficult), 4-5 (easy/perfect)
- Leaderboard points = (cards_studied × 10) + (correct × 5) + (streak_days × 20)

## 👥 Collaboration

- Sử dụng GitHub để quản lý code
- Mỗi nhóm cần commit ít nhất 10 commits
- Sử dụng meaningful commit messages

## 📄 License

MIT License


