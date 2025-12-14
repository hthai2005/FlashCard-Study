import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useState, useEffect, useRef } from 'react'

export default function TopNav() {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationsRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard'
    }
    if (path === '/sets') {
      return location.pathname === '/sets' || location.pathname.startsWith('/sets/')
    }
    if (path === '/study') {
      return location.pathname.startsWith('/study/')
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to sets page with search query
      navigate(`/sets?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="sticky top-0 z-10 w-full bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Góc trái - Logo Flashcard */}
          <Link 
            to="/" 
            className="flex items-center gap-2 text-slate-900 dark:text-white hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
          >
            <span className="material-symbols-outlined text-primary text-2xl">style</span>
            <h2 className="text-lg font-bold hidden sm:block">Thẻ Ghi Nhớ</h2>
          </Link>

          {/* Giữa - Navigation Links */}
          <nav className="flex items-center gap-3 sm:gap-4 lg:gap-6 flex-1 justify-center">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive('/')
                  ? 'text-primary dark:text-primary font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary'
              }`}
            >
              Trang Chủ
            </Link>
            <Link
              to="/sets"
              className={`text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive('/sets')
                  ? 'text-primary dark:text-primary font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary'
              }`}
            >
              Bộ Thẻ
            </Link>
            <Link
              to="/leaderboard"
              className={`text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive('/leaderboard')
                  ? 'text-primary dark:text-primary font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary'
              }`}
            >
              Bảng Xếp Hạng
            </Link>
            {user?.is_admin && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive('/admin')
                    ? 'text-primary dark:text-primary font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary'
                }`}
              >
                Quản Trị
              </Link>
            )}
          </nav>

          {/* Góc phải - Search, Notifications & User/Login-Register */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Search Bar */}
            <div className="hidden md:flex items-center max-w-xs">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative flex items-center h-10 w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/50">
                  <label className="flex-1 relative cursor-text">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none text-sm">search</span>
                    <input
                      className="w-full border-0 bg-transparent h-full pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0"
                      placeholder="Tìm kiếm..."
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </label>
                </div>
              </form>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  if (!showNotifications && unreadCount > 0) {
                    markAllAsRead()
                  }
                }}
                className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative cursor-pointer"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 flex flex-col">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Thông Báo</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary hover:underline"
                      >
                        Đánh dấu tất cả đã đọc
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-80">
                    {notifications.length === 0 ? (
                      <div className="p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                          Không có thông báo mới
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                              !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                            }`}
                            onClick={() => {
                              if (!notification.read) {
                                markAsRead(notification.id)
                              }
                              if (notification.action?.type === 'navigate' && notification.action.path) {
                                navigate(notification.action.path)
                                setShowNotifications(false)
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 mt-0.5 ${
                                notification.type === 'success' ? 'text-green-500' :
                                notification.type === 'error' ? 'text-red-500' :
                                notification.type === 'warning' ? 'text-yellow-500' :
                                'text-blue-500'
                              }`}>
                                <span className="material-symbols-outlined text-lg">
                                  {notification.type === 'success' ? 'check_circle' :
                                   notification.type === 'error' ? 'error' :
                                   notification.type === 'warning' ? 'warning' :
                                   'info'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  {new Date(notification.timestamp).toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                                className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                                aria-label="Xóa thông báo"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar - Click để vào Profile */}
            {user ? (
              <button
                onClick={() => navigate('/profile')}
                className="aspect-square rounded-full size-10 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden border-2 border-primary/20 hover:border-primary/40 relative"
                aria-label="User profile"
              >
                {user.avatar_url ? (
                  <>
                    <img
                      src={user.avatar_url.startsWith('http') ? user.avatar_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${user.avatar_url}`}
                      alt={user.username || 'User'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide image and show fallback initial on error
                        e.target.style.display = 'none'
                        const fallback = e.target.parentElement.querySelector('.avatar-fallback')
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div
                      className="avatar-fallback bg-gradient-to-br from-primary-400 to-purple-500 w-full h-full items-center justify-center text-white font-semibold text-sm hidden absolute inset-0"
                    >
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </>
                ) : (
                  <div className="bg-gradient-to-br from-primary-400 to-purple-500 w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg border border-primary text-primary bg-transparent text-sm font-medium hover:bg-primary/10 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Đăng Ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
