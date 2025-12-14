import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'

export default function AdminHeader({ pageTitle = 'Dashboard' }) {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
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

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Handle search - can navigate to search results
      console.log('Search:', searchQuery)
    }
  }

  return (
    <header className="sticky top-0 z-10 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left - Logo and App Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <span className="material-symbols-outlined text-white text-xl">school</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Thẻ Ghi Nhớ</h1>
        </div>

        {/* Center - Page Title */}
        <div className="flex-1 flex justify-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{pageTitle}</h2>
        </div>

        {/* Right - Search, Notifications, User Profile */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden md:flex items-center">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative flex items-center h-10 w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-primary/50">
                <span className="material-symbols-outlined absolute left-3 text-gray-400 dark:text-gray-500 text-sm pointer-events-none">search</span>
                <input
                  className="w-full border-0 bg-transparent h-full pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0"
                  placeholder="Tìm kiếm người dùng, bộ thẻ..."
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer relative"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Thông Báo</h3>
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
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        Không có thông báo mới
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
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
                              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
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
                              className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
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

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{user.username || 'admin'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {user.is_admin ? 'Quản Trị Viên' : 'Người Dùng'}
                </span>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="bg-gradient-to-br from-primary-400 to-purple-500 aspect-square rounded-full size-10 flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="User profile"
              >
                {user.username?.charAt(0).toUpperCase() || 'A'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}







