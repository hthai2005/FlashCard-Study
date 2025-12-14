import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Get storage key based on user ID
  const getStorageKey = () => {
    if (!user) return null
    return `notifications_${user.id}`
  }

  // Load notifications from localStorage on mount or when user changes
  useEffect(() => {
    const storageKey = getStorageKey()
    if (!storageKey) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const savedNotifications = localStorage.getItem(storageKey)
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications)
        setNotifications(parsed)
        setUnreadCount(parsed.filter(n => !n.read).length)
      } catch (e) {
        console.error('Error loading notifications:', e)
        setNotifications([])
        setUnreadCount(0)
      }
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [user?.id])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    const storageKey = getStorageKey()
    if (!storageKey) return

    if (notifications.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(notifications))
      setUnreadCount(notifications.filter(n => !n.read).length)
    } else {
      localStorage.removeItem(storageKey)
      setUnreadCount(0)
    }
  }, [notifications, user?.id])

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      type: notification.type || 'info', // 'success', 'info', 'warning', 'error'
      title: notification.title,
      message: notification.message,
      timestamp: new Date().toISOString(),
      read: false,
      action: notification.action || null, // { type: 'navigate', path: '/sets' }
      ...notification
    }
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Keep last 50 notifications
  }

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    const storageKey = getStorageKey()
    setNotifications([])
    if (storageKey) {
      localStorage.removeItem(storageKey)
    }
  }

  // Add notification for specific user (for admin notifications)
  const addNotificationForUser = (userId, notification) => {
    // Ensure userId is a number
    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId
    
    if (!numericUserId || isNaN(numericUserId)) {
      console.error('Invalid userId for notification:', userId)
      return
    }
    
    const storageKey = `notifications_${numericUserId}`
    const savedNotifications = localStorage.getItem(storageKey)
    let userNotifications = []
    
    if (savedNotifications) {
      try {
        userNotifications = JSON.parse(savedNotifications)
      } catch (e) {
        console.error('Error loading notifications for user:', e)
        userNotifications = []
      }
    }

    const newNotification = {
      id: Date.now() + Math.random(), // Ensure unique ID
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      timestamp: new Date().toISOString(),
      read: false,
      action: notification.action || null,
      ...notification
    }

    userNotifications = [newNotification, ...userNotifications].slice(0, 50)
    localStorage.setItem(storageKey, JSON.stringify(userNotifications))
    
    console.log(`Notification saved for user ${numericUserId} in ${storageKey}:`, {
      notification: newNotification,
      totalNotifications: userNotifications.length
    })
    
    // If this is for current user, update state immediately
    const currentUserId = typeof user?.id === 'string' ? parseInt(user?.id) : user?.id
    if (user && currentUserId === numericUserId) {
      setNotifications(userNotifications)
      setUnreadCount(userNotifications.filter(n => !n.read).length)
      console.log('Updated current user notifications state:', {
        userId: currentUserId,
        notificationsCount: userNotifications.length,
        unreadCount: userNotifications.filter(n => !n.read).length
      })
    } else {
      console.log('Notification saved for different user:', {
        targetUserId: numericUserId,
        currentUserId: currentUserId
      })
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        addNotificationForUser,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

