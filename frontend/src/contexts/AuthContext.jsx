import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setUser(response.data)
      return response.data
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    const response = await api.post('/api/auth/login', {
      username,
      password
    })
    const token = response.data.access_token
    localStorage.setItem('token', token)
    localStorage.setItem('username', username)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    
    // Fetch user and wait for it to complete
    try {
      const userData = await fetchUser()
      console.log('Login successful, user data:', userData)
      return response.data
    } catch (error) {
      // If fetchUser fails, clean up and rethrow
      console.error('Failed to fetch user after login:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      delete api.defaults.headers.common['Authorization']
      throw error
    }
  }

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/api/auth/register', {
        username,
        email,
        password
      })
      return response.data
    } catch (error) {
      console.error('Registration error:', error)
      // Re-throw error so it can be caught in the component
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

