import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <aside className="sticky top-0 h-screen w-64 flex-shrink-0 bg-[#111318]">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-8">
          <Link to="/dashboard" className="flex items-center gap-3 px-2">
            <div className="bg-gradient-to-br from-primary-500 to-purple-600 aspect-square rounded-full size-10 flex items-center justify-center text-white font-bold text-lg">
              📚
            </div>
            <div className="flex flex-col">
              <h1 className="text-white text-base font-medium leading-normal">Thẻ Ghi Nhớ</h1>
              <p className="text-[#9da6b9] text-sm font-normal leading-normal">Học thông minh hơn</p>
            </div>
          </Link>

          <nav className="flex flex-col gap-2">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                isActive('/dashboard')
                  ? 'bg-primary text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <p className="text-sm font-medium leading-normal">Trang Chủ</p>
            </Link>
            <Link
              to="/sets"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                isActive('/sets')
                  ? 'bg-primary text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined">layers</span>
              <p className="text-sm font-medium leading-normal">Bộ Thẻ Của Tôi</p>
            </Link>
            <Link
              to="/leaderboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                isActive('/leaderboard')
                  ? 'bg-primary text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined">leaderboard</span>
              <p className="text-sm font-medium leading-normal">Bảng Xếp Hạng</p>
            </Link>
            <Link
              to="/sets/create"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                location.pathname === '/sets/create'
                  ? 'bg-primary text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined">add_circle</span>
              <p className="text-sm font-medium leading-normal">Tạo Bộ Thẻ Mới</p>
            </Link>
            {user?.is_admin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-primary text-white'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined">admin_panel_settings</span>
                <p className="text-sm font-medium leading-normal">Quản Trị</p>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/10">
            <div className="bg-gradient-to-br from-primary-400 to-purple-500 aspect-square rounded-full size-10 flex items-center justify-center text-white font-semibold">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium text-white">{user?.username || 'Người Dùng'}</span>
              <span className="text-xs text-gray-400">{user?.email || ''}</span>
            </div>
          </div>
          <Link
            to="/ssh-connection"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              isActive('/ssh-connection')
                ? 'bg-primary text-white'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined">terminal</span>
            <p className="text-sm font-medium leading-normal">Kết Nối SSH</p>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg"
          >
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Đăng Xuất</p>
          </button>
        </div>
      </div>
    </aside>
  )
}

