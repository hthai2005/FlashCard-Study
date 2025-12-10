import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminHeader({ pageTitle = 'Dashboard' }) {
  const { user } = useAuth()
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
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Flashcard App</h1>
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
                  placeholder="Search for users, sets..."
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
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">notifications</span>
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No new notifications
                  </p>
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
                  {user.is_admin ? 'Administrator' : 'User'}
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




