import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Sets from './pages/Sets'
import Study from './pages/Study'
import Leaderboard from './pages/Leaderboard'
import CreateSet from './pages/CreateSet'
import Profile from './pages/Profile'
import Achievements from './pages/Achievements'
import AdminDashboard from './pages/AdminDashboard'
import UserManagement from './pages/UserManagement'
import SetManagement from './pages/SetManagement'
import ContentModeration from './pages/ContentModeration'
import ViewSet from './pages/ViewSet'
import SSHConnection from './pages/SSHConnection'
import StudyGuard from './components/StudyGuard'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  if (!user.is_admin) {
    return <Navigate to="/dashboard" />
  }
  
  return children
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="min-h-screen bg-background-light dark:bg-background-dark" style={{ backgroundColor: '#f6f6f8' }}>
            <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/sets" element={<Sets />} />
            <Route path="/sets/create" element={<CreateSet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="/admin/sets" element={<AdminRoute><SetManagement /></AdminRoute>} />
            <Route path="/admin/sets/:id" element={<AdminRoute><ViewSet /></AdminRoute>} />
            <Route path="/sets/:id" element={<ViewSet />} />
            <Route path="/admin/moderation" element={<AdminRoute><ContentModeration /></AdminRoute>} />
            <Route path="/ssh-connection" element={<SSHConnection />} />
            <Route
              path="/study/:setId"
              element={
                <StudyGuard>
                  <Study />
                </StudyGuard>
              }
            />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App

