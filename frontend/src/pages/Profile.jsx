import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, logout, loading: authLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user && !authLoading) {
      fetchUserData()
    } else if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading])

  const fetchUserData = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const userData = response.data
      setFormData({
        full_name: userData.full_name || userData.username || '',
        username: userData.username || '',
        email: userData.email || ''
      })
      // Set avatar URL if available
      if (userData.avatar_url) {
        // Check if it's already a full URL or relative path
        if (userData.avatar_url.startsWith('http')) {
          setAvatarUrl(userData.avatar_url)
        } else {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          setAvatarUrl(`${baseURL}${userData.avatar_url}`)
        }
      } else {
        setAvatarUrl(null)
      }
    } catch (error) {
      toast.error('Không thể tải dữ liệu người dùng')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      const updateData = {
        username: formData.username,
        email: formData.email
      }

      await api.put('/api/auth/me', updateData)
      toast.success('Đã cập nhật hồ sơ thành công!')
      setIsEditing(false)
      await fetchUserData() // Refresh data
      if (refreshUser) {
        await refreshUser() // Refresh user context để đồng bộ với admin
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Không thể cập nhật hồ sơ')
    }
  }

  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.old_password) {
      toast.error('Vui lòng nhập mật khẩu cũ')
      return
    }
    if (!passwordData.new_password) {
      toast.error('Vui lòng nhập mật khẩu mới')
      return
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    try {
      await api.post('/api/auth/change-password', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      })
      toast.success('Đã đổi mật khẩu thành công!')
      setShowPasswordModal(false)
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Không thể đổi mật khẩu')
    }
  }

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước file quá lớn. Tối đa 5MB')
      return
    }

    try {
      setUploadingAvatar(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/api/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      // Set avatar URL
      const avatarUrl = response.data.avatar_url
      if (avatarUrl.startsWith('http')) {
        setAvatarUrl(avatarUrl)
      } else {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        setAvatarUrl(`${baseURL}${avatarUrl}`)
      }
      toast.success('Đã tải ảnh đại diện thành công!')
      await fetchUserData() // Refresh data
      if (refreshUser) {
        await refreshUser() // Refresh user context để đồng bộ với admin
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Không thể tải ảnh đại diện')
    } finally {
      setUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCancel = () => {
    fetchUserData() // Reset form
    setIsEditing(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <TopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden">
      <TopNav />
      
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-24 flex flex-col gap-2 bg-white dark:bg-[#1c2327] p-4 rounded-xl border border-slate-200 dark:border-[#283339]">
              <a
                onClick={(e) => {
                  e.preventDefault()
                  setIsEditing(false)
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/20 text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">person</span>
                <p className="text-sm font-medium leading-normal">Hồ Sơ</p>
              </a>
              <a
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/achievements')
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#283339] text-slate-700 dark:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">military_tech</span>
                <p className="text-sm font-medium leading-normal">Thành Tựu</p>
              </a>
              <div className="border-t border-slate-200 dark:border-[#283339] my-2"></div>
              <a
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">logout</span>
                <p className="text-sm font-medium leading-normal">Đăng Xuất</p>
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6" id="profile">
                <div className="flex flex-wrap justify-between gap-3">
                  <h1 className="text-slate-900 dark:text-white text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">
                    Cài Đặt Hồ Sơ
                  </h1>
                </div>

                <div className="flex flex-col gap-6 bg-white dark:bg-[#1c2327] p-6 rounded-xl border border-slate-200 dark:border-[#283339]">
                  {/* Avatar Section */}
                  <div className="flex p-2">
                    <div className="flex w-full flex-col gap-4 md:flex-row md:justify-between md:items-center">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Avatar"
                              className="aspect-square rounded-full min-h-24 w-24 sm:min-h-32 sm:w-32 object-cover border-2 border-white dark:border-[#1c2327]"
                              onError={(e) => {
                                // Hide image and show fallback
                                const img = e.target
                                const fallback = img.nextElementSibling
                                if (img) img.style.display = 'none'
                                if (fallback) fallback.style.display = 'flex'
                                setAvatarUrl(null) // Clear invalid URL
                              }}
                            />
                          ) : null}
                          <div 
                            className={`bg-gradient-to-br from-primary-400 to-purple-500 aspect-square rounded-full min-h-24 w-24 sm:min-h-32 sm:w-32 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold ${avatarUrl ? 'hidden' : ''}`}
                            style={{ display: avatarUrl ? 'none' : 'flex' }}
                          >
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploadingAvatar}
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="absolute bottom-0 right-0 flex items-center justify-center size-8 sm:size-10 bg-primary text-white rounded-full border-2 border-white dark:border-[#1c2327] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingAvatar ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <span className="material-symbols-outlined text-lg sm:text-xl">edit</span>
                            )}
                          </button>
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="text-slate-900 dark:text-white text-xl sm:text-[22px] font-bold leading-tight tracking-[-0.015em]">
                            {formData.full_name || user.username || 'Người Dùng'}
                          </p>
                          <p className="text-slate-500 dark:text-[#9db0b9] text-base font-normal leading-normal">
                            @{formData.username || user.username || 'user'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <form className="flex flex-col gap-6 p-2">
                    <div className="flex flex-col md:flex-row gap-6">
                      <label className="flex flex-col min-w-40 flex-1">
                        <p className="text-slate-800 dark:text-white text-sm font-medium leading-normal pb-2">
                          Họ Và Tên
                        </p>
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-[#3b4b54] bg-background-light dark:bg-[#101c22] focus:border-primary dark:focus:border-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#9db0b9] px-4 text-base font-normal leading-normal"
                          value={formData.full_name}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                          disabled={!isEditing}
                        />
                      </label>
                      <label className="flex flex-col min-w-40 flex-1">
                        <p className="text-slate-800 dark:text-white text-sm font-medium leading-normal pb-2">
                          Tên Đăng Nhập
                        </p>
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-[#3b4b54] bg-background-light dark:bg-[#101c22] focus:border-primary dark:focus:border-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#9db0b9] px-4 text-base font-normal leading-normal"
                          value={formData.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          disabled={!isEditing}
                        />
                      </label>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                      <label className="flex flex-col min-w-40 flex-1">
                        <p className="text-slate-800 dark:text-white text-sm font-medium leading-normal pb-2">
                          Địa Chỉ Email
                        </p>
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-[#3b4b54] bg-background-light dark:bg-[#101c22] focus:border-primary dark:focus:border-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#9db0b9] px-4 text-base font-normal leading-normal"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          disabled={!isEditing}
                        />
                      </label>
                      <div className="flex flex-col min-w-40 flex-1">
                        <p className="text-slate-800 dark:text-white text-sm font-medium leading-normal pb-2">
                          Mật Khẩu
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPasswordModal(true)}
                          className="flex w-full min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-[#3b4b54] bg-background-light dark:bg-[#101c22] focus:border-primary dark:focus:border-primary h-12 px-4 text-base font-normal leading-normal hover:bg-slate-100 dark:hover:bg-[#1a2327] transition-colors"
                        >
                          <span className="material-symbols-outlined">lock</span>
                          <span>Đổi Mật Khẩu</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="border-t border-slate-200 dark:border-[#283339]"></div>

                  <div className="flex justify-end gap-3 p-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleCancel}
                          className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-slate-200 dark:bg-[#283339] text-slate-800 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-300 dark:hover:bg-[#3b4b54] transition-colors"
                        >
                          <span className="truncate">Hủy</span>
                        </button>
                        <button
                          onClick={handleSave}
                          className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                        >
                          <span className="truncate">Lưu Thay Đổi</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                      >
                        <span className="truncate">Chỉnh Sửa Hồ Sơ</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Đổi Mật Khẩu</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordData({
                    old_password: '',
                    new_password: '',
                    confirm_password: ''
                  })
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mật Khẩu Cũ
                </label>
                <input
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nhập mật khẩu cũ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mật Khẩu Mới
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                />
                {passwordData.new_password && passwordData.new_password.length < 6 && (
                  <p className="text-red-500 text-xs mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Xác Nhận Mật Khẩu Mới
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nhập lại mật khẩu mới"
                />
                {passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
                  <p className="text-red-500 text-xs mt-1">Mật khẩu xác nhận không khớp</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordData({
                    old_password: '',
                    new_password: '',
                    confirm_password: ''
                  })
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Hủy
              </button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Đổi Mật Khẩu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

