import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Get storage key based on user ID
  const getStorageKey = () => {
    if (!user) return null
    return `notifications_${user.id}`
  }

  // Fetch notifications from backend (for admin) and localStorage
  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    try {
      setLoading(true)
      const allNotifications = []

      // Fetch from backend
      try {
        if (user.is_admin) {
          // Admin: Get pending sets and reports
          const response = await api.get('/api/notifications/')
          const backendData = response.data

          // Convert backend notifications to frontend format
          backendData.notifications.forEach((notif) => {
            // Use unique ID combining type and item_id to avoid conflicts
            allNotifications.push({
              id: `admin_${notif.type}_${notif.id}`,
              type: notif.type === 'pending_set' ? 'warning' : 'error',
              title: notif.title,
              message: notif.message,
              timestamp: notif.created_at,
              read: false,
              action: notif.type === 'pending_set' 
                ? { type: 'navigate', path: `/admin/sets?pending=true` }
                : { type: 'navigate', path: `/admin/reports?pending=true` },
              item_id: notif.item_id,
              notification_type: notif.type
            })
          })
        }
        
        // All users: Get user-specific notifications (set pending, approved, etc.)
        try {
          const userResponse = await api.get('/api/notifications/user')
          const userData = userResponse.data

          // Convert user notifications to frontend format
          userData.notifications.forEach((notif) => {
            allNotifications.push({
              id: `user_${notif.id}`,
              type: notif.type === 'set_approved' ? 'success' : 
                    notif.type === 'set_pending' ? 'warning' : 
                    notif.type === 'set_rejected' ? 'error' : 'info',
              title: notif.title,
              message: notif.message,
              timestamp: notif.created_at,
              read: notif.read,
              action: notif.action_path ? { type: 'navigate', path: notif.action_path } : null,
              item_id: notif.item_id,
              notification_type: notif.type
            })
          })
        } catch (userError) {
          console.error('Error fetching user notifications:', userError)
        }
      } catch (error) {
        console.error('Error fetching backend notifications:', error)
        // Continue with localStorage notifications even if backend fails
      }

      // Load from localStorage
      const storageKey = getStorageKey()
      if (storageKey) {
        const savedNotifications = localStorage.getItem(storageKey)
        if (savedNotifications) {
          try {
            const parsed = JSON.parse(savedNotifications)
            // Merge with backend notifications, avoiding duplicates
            parsed.forEach((localNotif) => {
              // Only add if not already in allNotifications (by id and type)
              const exists = allNotifications.some(
                n => n.id === localNotif.id && n.notification_type === localNotif.notification_type
              )
              if (!exists) {
                allNotifications.push(localNotif)
              }
            })
          } catch (e) {
            console.error('Error loading localStorage notifications:', e)
          }
        }
      }

      // Sort by timestamp descending
      allNotifications.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime()
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime()
        return timeB - timeA
      })

      setNotifications(allNotifications)
      setUnreadCount(allNotifications.filter(n => !n.read).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load notifications on mount or when user changes
  useEffect(() => {
    fetchNotifications()
  }, [user?.id, user?.is_admin])

  // Poll for new notifications every 30 seconds (for all users)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
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

  const markAsRead = async (id) => {
    // Update local state immediately
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    
    // Update backend if it's a user notification
    if (id.startsWith('user_')) {
      const notificationId = parseInt(id.replace('user_', ''))
      try {
        await api.put(`/api/notifications/user/${notificationId}/read`)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }
  }

  const markAllAsRead = async () => {
    // Update local state immediately
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
    
    // Update backend
    try {
      await api.put('/api/notifications/user/read-all')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
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
        loading,
        addNotification,
        addNotificationForUser,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refreshNotifications: fetchNotifications
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

