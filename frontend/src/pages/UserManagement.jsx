import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import AdminSidebar from '../components/AdminSidebar'
import AdminHeader from '../components/AdminHeader'

export default function UserManagement() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ username: '', email: '', is_admin: false, is_active: true })
  const usersPerPage = 5

  useEffect(() => {
    if (user && !authLoading) {
      fetchUsers()
    }
  }, [user, authLoading, currentPage])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-dropdown')) {
        setShowRoleDropdown(false)
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/admin/users').catch((err) => {
        console.error('Error fetching users:', err)
        return { data: { users: [], total: 0 } }
      })

      if (response.data && response.data.users) {
        // Map API data to frontend format
        const mappedUsers = response.data.users.map((user) => {
          // Format date
          const dateJoined = user.created_at 
            ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'N/A'
          
          // Format last active date
          let lastActive = 'Never'
          if (user.last_active) {
            const lastActiveDate = new Date(user.last_active)
            const now = new Date()
            const diffTime = Math.abs(now - lastActiveDate)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            if (diffDays === 0) {
              lastActive = 'Today'
            } else if (diffDays === 1) {
              lastActive = 'Yesterday'
            } else if (diffDays < 7) {
              lastActive = `${diffDays} days ago`
            } else {
              lastActive = lastActiveDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            }
          }
          
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.username, // Use username as full_name if not available
            role: user.is_admin ? 'Admin' : 'User',
            date_joined: dateJoined,
            last_active: lastActive,
            status: user.is_active ? 'Active' : 'Suspended',
            is_admin: user.is_admin,
            is_active: user.is_active
          }
        })
        
        setUsers(mappedUsers)
        setTotalUsers(response.data.total || mappedUsers.length)
      } else {
        setUsers([])
        setTotalUsers(0)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users')
      setUsers([])
      setTotalUsers(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(filteredUsers.map(u => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/api/admin/users/${userId}`)
        toast.success('User deleted successfully')
        fetchUsers()
      } catch (error) {
        toast.error('Failed to delete user')
      }
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setEditForm({
      username: user.username || '',
      email: user.email || '',
      is_admin: user.is_admin || false,
      is_active: user.is_active !== false
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    
    // Validation
    if (!editForm.username.trim()) {
      toast.error('Username is required')
      return
    }
    if (!editForm.email.trim()) {
      toast.error('Email is required')
      return
    }
    if (!editForm.email.includes('@')) {
      toast.error('Invalid email format')
      return
    }
    
    try {
      await api.put(`/api/admin/users/${editingUser.id}`, {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        is_admin: editForm.is_admin,
        is_active: editForm.is_active
      })
      toast.success('User updated successfully')
      setShowEditModal(false)
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to update user'
      toast.error(errorMessage)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'All' || user.role === roleFilter
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  )

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)

  if (authLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background-light dark:bg-background-dark">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <AdminHeader pageTitle="User Management" />
        <div className="p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col">
          {/* PageHeading */}
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              User Management
            </h1>
            <button
              onClick={() => toast.info('Add user functionality coming soon!')}
              className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-[#111618] text-sm font-bold leading-normal tracking-[0.015em]"
            >
              <span className="material-symbols-outlined">add</span>
              <span className="truncate">Add User</span>
            </button>
          </header>

          {/* Search and Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {/* SearchBar */}
            <div className="flex-grow">
              <label className="flex flex-col min-w-40 h-12 w-full">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                  <div className="text-gray-500 dark:text-gray-400 flex border-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 items-center justify-center pl-4 rounded-l-lg border-r-0">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 rounded-l-none pl-2 text-base font-normal leading-normal"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {/* Chips */}
            <div className="flex gap-3 flex-wrap relative">
              {/* Role Filter Dropdown */}
              <div className="relative filter-dropdown">
                <button
                  onClick={() => {
                    setShowRoleDropdown(!showRoleDropdown)
                    setShowStatusDropdown(false)
                  }}
                  className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <p className="text-gray-900 dark:text-white text-sm font-medium leading-normal">Role: {roleFilter}</p>
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_drop_down</span>
                </button>
                {showRoleDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-10 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                    {['All', 'Admin', 'User'].map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          setRoleFilter(role)
                          setShowRoleDropdown(false)
                          setCurrentPage(1)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          roleFilter === role
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative filter-dropdown">
                <button
                  onClick={() => {
                    setShowStatusDropdown(!showStatusDropdown)
                    setShowRoleDropdown(false)
                  }}
                  className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <p className="text-gray-900 dark:text-white text-sm font-medium leading-normal">Status: {statusFilter}</p>
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_drop_down</span>
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-10 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                    {['All', 'Active', 'Suspended'].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status)
                          setShowStatusDropdown(false)
                          setCurrentPage(1)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          statusFilter === status
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setSearchQuery('')
                  setRoleFilter('All')
                  setStatusFilter('All')
                  setCurrentPage(1)
                }}
                className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
                <p className="text-sm font-medium leading-normal">Clear Filters</p>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6">
            <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <input
                        className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0"
                        type="checkbox"
                        checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-gray-900 dark:text-white text-sm font-medium leading-normal">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-gray-900 dark:text-white text-sm font-medium leading-normal">Role</th>
                    <th className="px-4 py-3 text-left text-gray-900 dark:text-white text-sm font-medium leading-normal">
                      Date Joined
                    </th>
                    <th className="px-4 py-3 text-left text-gray-900 dark:text-white text-sm font-medium leading-normal">
                      Last Active
                    </th>
                    <th className="px-4 py-3 text-left text-gray-900 dark:text-white text-sm font-medium leading-normal">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-gray-900 dark:text-white text-sm font-medium leading-normal">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-t border-t-gray-200 dark:border-t-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      >
                        <td className="p-4 text-center">
                          <input
                            className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0"
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white text-sm font-normal leading-normal">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-primary-400 to-purple-500 aspect-square rounded-full size-8 flex items-center justify-center text-white text-xs font-semibold">
                              {user.full_name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="text-gray-900 dark:text-white">{user.full_name || user.username}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm font-normal leading-normal">
                          {user.role}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm font-normal leading-normal">
                          {user.date_joined}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm font-normal leading-normal">
                          {user.last_active}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              user.status === 'Active'
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : user.status === 'Suspended'
                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm leading-normal">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                              <span className="material-symbols-outlined text-xl">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                            <button
                              onClick={() => toast.info('More options coming soon!')}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                              <span className="material-symbols-outlined text-xl">more_horiz</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * usersPerPage + 1} to {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                const page = currentPage <= 2 ? i + 1 : currentPage - 1 + i
                if (page > totalPages) return null
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 ${
                      currentPage === page
                        ? 'bg-primary text-white border-primary'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit User</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_admin}
                    onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Role</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Status</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

