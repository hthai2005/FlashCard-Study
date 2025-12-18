import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import AdminSidebar from '../components/AdminSidebar'
import AdminHeader from '../components/AdminHeader'
import TopNav from '../components/TopNav'
import ReportButton from '../components/ReportButton'

export default function ViewSet() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const { addNotification, addNotificationForUser } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [setInfo, setSetInfo] = useState(null)
  const [cards, setCards] = useState([])
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [newCard, setNewCard] = useState({ front: '', back: '' })
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importMode, setImportMode] = useState('file') // 'file' or 'paste'
  const [importFileContent, setImportFileContent] = useState('')
  const [progress, setProgress] = useState(null)
  const [lastStudied, setLastStudied] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState({ title: '', description: '', is_public: false })
  const [isUpdating, setIsUpdating] = useState(false)
  const isAdmin = user?.is_admin || false
  const isAdminPage = location.pathname.startsWith('/admin')
  
  // Check if user is the owner of the set
  const isOwner = setInfo && user && setInfo.owner_id === user.id

  useEffect(() => {
    if (user && !authLoading) {
      fetchSetData()
    } else if (!authLoading && !user) {
      navigate('/login')
    }
  }, [id, user, authLoading])

  const fetchSetData = async () => {
    try {
      setLoading(true)
      console.log('Fetching set data for ID:', id)
      
      // Admin can access any set via regular endpoint
      const [setRes, cardsRes, progressRes, lastStudiedRes] = await Promise.all([
        api.get(`/api/flashcards/sets/${id}`).catch((err) => {
          console.error('Error fetching set:', err)
          console.error('Error details:', err.response?.data)
          return { data: null, error: err }
        }),
        api.get(`/api/flashcards/sets/${id}/cards`).catch((err) => {
          console.error('Error fetching cards:', err)
          return { data: [] }
        }),
        api.get(`/api/study/progress/${id}`).catch(() => ({ data: null })),
        api.get('/api/study/sets/last-studied').catch(() => ({ data: {} }))
      ])

      console.log('Set response:', setRes)
      console.log('Cards response:', cardsRes)
      console.log('Progress response:', progressRes)

      if (setRes.data) {
        console.log('Setting setInfo:', setRes.data)
        setSetInfo(setRes.data)
        setCards(cardsRes.data || [])
        setProgress(progressRes.data)
        
        // Get last studied date for this set
        if (lastStudiedRes.data && lastStudiedRes.data[id]) {
          setLastStudied(new Date(lastStudiedRes.data[id]))
        }
      } else {
        const errorMessage = setRes.error?.response?.data?.detail || setRes.error?.message || 'Flashcard set not found'
        console.error('Failed to fetch set:', errorMessage)
        toast.error(errorMessage)
        // Don't navigate immediately, let user see the error
      }
    } catch (error) {
      console.error('Error fetching set data:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load flashcard set'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFileImport = async (e) => {
    e.preventDefault()
    if (!id) {
      toast.error('Không tìm thấy bộ thẻ')
      return
    }
    
    try {
      if (importMode === 'file' && importFile) {
        // Upload file
        const formData = new FormData()
        formData.append('file', importFile)
        
        const response = await api.post(`/api/ai/import/file?set_id=${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        toast.success(`Đã nhập ${response.data.count} flashcard thành công!`)
      } else if (importMode === 'paste' && importFileContent) {
        // Paste content
        await api.post('/api/ai/import', {
          set_id: parseInt(id),
          file_content: importFileContent
        })
        toast.success('Đã nhập flashcard thành công!')
      } else {
        toast.error('Vui lòng chọn file hoặc dán nội dung')
        return
      }
      
      setShowImportModal(false)
      setImportFile(null)
      setImportFileContent('')
      fetchSetData() // Refresh cards
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Không thể nhập flashcard'
      toast.error(errorMessage)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase()
      if (extension !== 'csv' && extension !== 'json') {
        toast.error('Chỉ chấp nhận file CSV hoặc JSON')
        return
      }
      setImportFile(file)
    }
  }

  const handleAddCard = async (e) => {
    e.preventDefault()
    if (!newCard.front.trim() || !newCard.back.trim()) {
      toast.error('Vui lòng nhập đầy đủ mặt trước và mặt sau')
      return
    }

    try {
      setIsAddingCard(true)
      const response = await api.post(`/api/flashcards/sets/${id}/cards`, {
        front: newCard.front.trim(),
        back: newCard.back.trim()
      })
      setCards([...cards, response.data])
      setNewCard({ front: '', back: '' })
      setShowAddCardModal(false)
      toast.success('Đã thêm thẻ thành công!')
      // Refresh progress to update total cards
      fetchSetData()
    } catch (error) {
      console.error('Error adding card:', error)
      toast.error(error.response?.data?.detail || 'Không thể thêm thẻ')
    } finally {
      setIsAddingCard(false)
    }
  }

  const handleStartStudy = () => {
    // Start fresh study session
    navigate(`/study/${id}`)
  }

  const handleContinueStudy = () => {
    // Continue from where user left off (will load due cards)
    navigate(`/study/${id}`)
  }

  const handleRestartFromBeginning = async () => {
    if (!window.confirm('Bạn có chắc muốn học lại từ đầu? Tiến độ hiện tại sẽ được reset.')) {
      return
    }

    try {
      await api.delete(`/api/study/sets/${id}/reset`)
      toast.success('Đã reset tiến độ học tập')
      // Refresh progress
      const progressRes = await api.get(`/api/study/progress/${id}`).catch(() => ({ data: null }))
      setProgress(progressRes.data)
      // Navigate to study page to start fresh
      navigate(`/study/${id}`)
    } catch (error) {
      console.error('Error resetting progress:', error)
      toast.error('Không thể reset tiến độ học tập')
    }
  }

  const handleEditSet = () => {
    if (!setInfo) return
    setEditData({
      title: setInfo.title || '',
      description: setInfo.description || '',
      is_public: setInfo.is_public || false
    })
    setShowEditModal(true)
  }

  const handleUpdateSet = async (e) => {
    e.preventDefault()
    if (!editData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bộ thẻ')
      return
    }

    try {
      setIsUpdating(true)
      const oldTitle = setInfo.title
      const oldDescription = setInfo.description
      const oldIsPublic = setInfo.is_public

      const response = await api.put(`/api/flashcards/sets/${id}`, {
        title: editData.title.trim(),
        description: editData.description.trim() || null,
        is_public: editData.is_public
      })

      // Check what changed
      const changes = []
      if (oldTitle !== editData.title.trim()) {
        changes.push(`Tiêu đề: "${oldTitle}" → "${editData.title.trim()}"`)
      }
      if (oldDescription !== editData.description.trim()) {
        changes.push(`Mô tả đã được thay đổi`)
      }
      if (oldIsPublic !== editData.is_public) {
        changes.push(`Quyền truy cập: ${oldIsPublic ? 'Công khai' : 'Riêng tư'} → ${editData.is_public ? 'Công khai' : 'Riêng tư'}`)
      }

      if (changes.length > 0) {
        // Notify user
        addNotification({
          type: 'success',
          title: 'Đã cập nhật thông tin bộ thẻ',
          message: `Bộ thẻ "${editData.title.trim()}" đã được cập nhật thành công.`,
          action: { type: 'navigate', path: `/sets/${id}` }
        })

        // Notify all admins about the change
        try {
          const adminsResponse = await api.get('/api/admin/admins')
          const admins = adminsResponse.data
          admins.forEach(admin => {
            addNotificationForUser(admin.id, {
              type: 'info',
              title: 'Bộ thẻ đã được cập nhật',
              message: `Bộ thẻ "${editData.title.trim()}" của ${user?.username || 'một người dùng'} đã được cập nhật: ${changes.join(', ')}.`,
              action: { type: 'navigate', path: `/admin/sets/${id}` }
            })
          })
        } catch (notifError) {
          console.error('Error notifying admins:', notifError)
        }
      }

      toast.success('Đã cập nhật thông tin bộ thẻ thành công')
      setShowEditModal(false)
      fetchSetData() // Refresh data
    } catch (error) {
      console.error('Error updating set:', error)
      toast.error(error.response?.data?.detail || 'Không thể cập nhật thông tin bộ thẻ')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteSet = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa bộ thẻ này? Hành động này không thể hoàn tác.')) {
      return
    }

    try {
      await api.delete(`/api/flashcards/sets/${id}`)
      toast.success('Đã xóa bộ thẻ thành công')
      
      // Add notification
      addNotification({
        type: 'info',
        title: 'Đã xóa bộ thẻ',
        message: `Bộ thẻ "${setInfo?.title || 'Bộ thẻ'}" đã được xóa thành công`,
        action: { type: 'navigate', path: '/sets' }
      })
      
      navigate('/sets')
    } catch (error) {
      console.error('Error deleting set:', error)
      toast.error(error.response?.data?.detail || 'Không thể xóa bộ thẻ')
    }
  }

  const handleApproveSet = async () => {
    try {
      const response = await api.put(`/api/admin/sets/${id}/approve`)
      toast.success('Đã duyệt bộ thẻ thành công')
      
      // Add notification for admin
      try {
        addNotification({
          type: 'success',
          title: 'Đã duyệt bộ thẻ',
          message: `Bộ thẻ "${setInfo?.title || 'Bộ thẻ'}" đã được duyệt thành công`,
          action: { type: 'navigate', path: `/admin/sets/${id}` }
        })
      } catch (notifError) {
        console.error('Error adding notification:', notifError)
      }

      // Add notification for the deck owner (if not admin)
      if (setInfo && setInfo.owner_id) {
        // Convert both to numbers for comparison
        const ownerId = typeof setInfo.owner_id === 'string' ? parseInt(setInfo.owner_id) : setInfo.owner_id
        const currentUserId = typeof user?.id === 'string' ? parseInt(user?.id) : user?.id
        
        if (ownerId && ownerId !== currentUserId) {
          try {
            console.log('Adding notification for deck owner:', {
              ownerId,
              currentUserId,
              deckTitle: setInfo.title,
              deckId: id
            })
            
            addNotificationForUser(ownerId, {
              type: 'success',
              title: 'Bộ thẻ đã được duyệt',
              message: `Bộ thẻ "${setInfo.title}" của bạn đã được admin duyệt và có thể sử dụng`,
              action: { type: 'navigate', path: `/sets/${id}` }
            })
            
            console.log('Notification added successfully for user:', ownerId)
          } catch (notifError) {
            console.error('Error adding notification for user:', notifError)
          }
        } else {
          console.log('Skipping notification - owner is current user:', {
            ownerId,
            currentUserId
          })
        }
      } else {
        console.log('Skipping notification - missing setInfo or owner_id:', {
          hasSetInfo: !!setInfo,
          ownerId: setInfo?.owner_id
        })
      }
      
      // Refresh set data
      try {
        await fetchSetData()
      } catch (fetchError) {
        console.error('Error refreshing set data:', fetchError)
        // Still show success since the approve worked
      }
    } catch (error) {
      console.error('Error approving set:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Không thể duyệt bộ thẻ'
      toast.error(errorMessage)
    }
  }

  const handleRejectSet = async () => {
    if (!window.confirm('Bạn có chắc muốn từ chối bộ thẻ này?')) {
      return
    }

    try {
      await api.put(`/api/admin/sets/${id}/reject`)
      toast.success('Đã từ chối bộ thẻ')
      
      // Add notification for admin
      addNotification({
        type: 'warning',
        title: 'Đã từ chối bộ thẻ',
        message: `Bộ thẻ "${setInfo?.title || 'Bộ thẻ'}" đã bị từ chối`,
        action: { type: 'navigate', path: `/admin/sets/${id}` }
      })
      
      // Refresh set data
      fetchSetData()
    } catch (error) {
      console.error('Error rejecting set:', error)
      toast.error(error.response?.data?.detail || 'Không thể từ chối bộ thẻ')
    }
  }

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

  if (isAdmin) {
  return (
      <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
        <AdminHeader pageTitle={setInfo?.title || 'Xem Bộ Thẻ'} />

        <div className="flex h-[calc(100vh-4rem)] grow">
          <AdminSidebar />

          <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-8">
          {!setInfo ? (
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center min-h-[400px]">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Không tìm thấy bộ thẻ</p>
              <button
                onClick={() => navigate(isAdmin ? '/admin/sets' : '/sets')}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg"
              >
                Quay Lại Danh Sách
              </button>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-7xl flex-col">
              {/* Header */}
              <div className="mb-6">
                <button
                  onClick={() => navigate(isAdmin ? '/admin/sets' : '/sets')}
                  className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Về Bộ Thẻ</span>
                </button>
                <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                  {setInfo.title}
                </h1>
                {setInfo.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{setInfo.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Tạo: {new Date(setInfo.created_at).toLocaleDateString('vi-VN')}</span>
                    <span>•</span>
                    <span>Thẻ: {cards.length}</span>
                    <span>•</span>
                    <span className={`${setInfo.is_public ? 'text-green-500' : 'text-yellow-500'}`}>
                      {setInfo.is_public ? 'Công Khai' : 'Riêng Tư'}
                    </span>
                    <span>•</span>
                    <span className={`${
                      setInfo.status === 'approved' ? 'text-green-500' :
                      setInfo.status === 'rejected' ? 'text-red-500' :
                      'text-yellow-500'
                    }`}>
                      {setInfo.status === 'approved' ? 'Đã Duyệt' :
                       setInfo.status === 'rejected' ? 'Đã Từ Chối' :
                       'Chờ Duyệt'}
                    </span>
                  </div>
                  {isOwner && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <span className="material-symbols-outlined">upload_file</span>
                        <span>Nhập Flashcard</span>
                      </button>
                      <button
                        onClick={() => setShowAddCardModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <span className="material-symbols-outlined">add</span>
                        <span>Thêm Thẻ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Actions (Admin Only) */}
              {isAdmin && setInfo.status !== 'approved' && (
                <div className="mb-6 flex flex-wrap gap-3">
                  <button
                    onClick={handleApproveSet}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>Duyệt Bộ Thẻ</span>
                  </button>
                  <button
                    onClick={handleRejectSet}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    <span>Từ Chối</span>
                  </button>
                </div>
              )}

              {/* Cards List */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {cards.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Không có thẻ nào trong bộ này
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cards.map((card, index) => (
                      <div key={card.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-base border-2 border-primary/20">
                            {index + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-primary">help_outline</span>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mặt Trước</p>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
                                <p className="text-gray-900 dark:text-white text-base leading-relaxed">{card.front}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-400">check_circle</span>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mặt Sau</p>
                              </div>
                              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-900/30">
                                <p className="text-gray-900 dark:text-white text-base leading-relaxed">{card.back}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
          </main>
        </div>

        {/* Add Card Modal */}
        {showAddCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thêm Thẻ Mới</h2>
                <button
                  onClick={() => {
                    setShowAddCardModal(false)
                    setNewCard({ front: '', back: '' })
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleAddCard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mặt Trước
                  </label>
                  <textarea
                    value={newCard.front}
                    onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    rows="3"
                    placeholder="Nhập nội dung mặt trước..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mặt Sau
                  </label>
                  <textarea
                    value={newCard.back}
                    onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    rows="3"
                    placeholder="Nhập nội dung mặt sau..."
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCardModal(false)
                      setNewCard({ front: '', back: '' })
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingCard}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingCard ? 'Đang thêm...' : 'Thêm Thẻ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Regular user view
  return (
    <div className="min-h-screen w-full bg-background-light dark:bg-background-dark flex flex-col">
      <TopNav />

      <main className="flex-1 flex flex-col items-center py-8 px-4 md:px-10 lg:px-40 w-full max-w-[1440px] mx-auto">
        <div className="flex flex-col max-w-[960px] w-full flex-1 gap-6">
          {!setInfo ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Không tìm thấy bộ thẻ</p>
              <button
                onClick={() => navigate('/sets')}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg"
              >
                Quay Lại Danh Sách
              </button>
            </div>
          ) : (
            <>
              {/* Breadcrumbs */}
              <div className="flex flex-wrap gap-2 items-center text-sm">
                <button
                  onClick={() => navigate('/sets')}
                  className="text-secondary-text hover:text-primary transition-colors font-medium"
                >
                  Bộ Thẻ
                </button>
                <span className="material-symbols-outlined text-secondary-text text-[16px]">chevron_right</span>
                <span className="text-slate-900 dark:text-white font-medium">{setInfo.title}</span>
              </div>

              {/* Page Heading & Actions */}
              <div className="flex flex-col md:flex-row justify-between gap-6 pb-2 border-b dark:border-border-dark border-slate-200">
                <div className="flex flex-col gap-3">
                  <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
                    {setInfo.title}
                  </h1>
                  <div className="flex items-center gap-3 text-secondary-text text-sm md:text-base">
                    {setInfo.owner_username && (
                      <>
                        <div className="flex items-center gap-2">
                          {setInfo.owner_avatar_url ? (
                            <img
                              src={setInfo.owner_avatar_url.startsWith('http') ? setInfo.owner_avatar_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${setInfo.owner_avatar_url}`}
                              alt={setInfo.owner_username}
                              className="w-6 h-6 rounded-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextElementSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold ${setInfo.owner_avatar_url ? 'hidden' : ''}`}
                            style={{ display: setInfo.owner_avatar_url ? 'none' : 'flex' }}
                          >
                            {setInfo.owner_username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{setInfo.owner_username}</span>
                        </div>
                        <span>•</span>
                      </>
                    )}
                    <span>{cards.length} Thẻ</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">
                        {setInfo.is_public ? 'public' : 'lock'}
                      </span>
                      {setInfo.is_public ? 'Công Khai' : 'Riêng Tư'}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {/* Show different buttons based on study progress */}
                  {!progress || progress.cards_studied === 0 ? (
                    <button
                      onClick={handleStartStudy}
                      className="flex h-12 px-6 items-center justify-center rounded-lg bg-primary text-white font-bold hover:bg-blue-600 transition-all shadow-md gap-2"
                    >
                      <span className="material-symbols-outlined text-xl">play_circle</span>
                      <span>Bắt Đầu Học</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleContinueStudy}
                        className="flex h-12 px-6 items-center justify-center rounded-lg bg-primary text-white font-bold hover:bg-blue-600 transition-all shadow-md gap-2 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-xl">play_circle</span>
                        <span>Tiếp Tục Học</span>
                      </button>
                      <button
                        onClick={handleRestartFromBeginning}
                        className="flex h-12 px-6 items-center justify-center rounded-lg bg-white dark:bg-surface-dark border-2 border-slate-200 dark:border-border-dark text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all gap-2 font-medium"
                      >
                        <span className="material-symbols-outlined text-xl">refresh</span>
                        <span>Học Lại Từ Đầu</span>
                      </button>
                    </>
                  )}
                  {isOwner && (
                    <>
                      <button
                        onClick={() => setShowAddCardModal(true)}
                        className="flex h-12 w-12 items-center justify-center rounded-lg bg-white dark:bg-surface-dark border-2 border-slate-200 dark:border-border-dark text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        title="Thêm Thẻ"
                      >
                        <span className="material-symbols-outlined text-xl">add</span>
                      </button>
                      <button
                        onClick={handleEditSet}
                        className="flex h-12 w-12 items-center justify-center rounded-lg bg-white dark:bg-surface-dark border-2 border-slate-200 dark:border-border-dark text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        title="Sửa thông tin"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        onClick={handleDeleteSet}
                        className="flex h-12 w-12 items-center justify-center rounded-lg bg-white dark:bg-surface-dark border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Xóa"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </>
                  )}
                  {!isOwner && setInfo && setInfo.is_public && (
                    <ReportButton
                      itemType="deck"
                      itemId={parseInt(id)}
                      ownerId={setInfo.owner_id}
                      itemTitle={setInfo.title}
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              {setInfo.description && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <p className="text-slate-700 dark:text-blue-100 text-base font-normal leading-relaxed">
                    {setInfo.description}
                  </p>
                </div>
              )}

              {/* Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mastery Stat */}
                <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-primary">verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-secondary-text">
                    <span className="material-symbols-outlined text-lg">verified</span>
                    <p className="text-sm font-bold uppercase tracking-wider">Thành Thạo</p>
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white text-3xl font-bold">
                      {progress && progress.total_cards > 0 
                        ? Math.round((progress.cards_studied / progress.total_cards) * 100) 
                        : 0}%
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ 
                        width: `${progress && progress.total_cards > 0 
                          ? Math.min(100, Math.round((progress.cards_studied / progress.total_cards) * 100)) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Learned Stat */}
                <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-primary">style</span>
                  </div>
                  <div className="flex items-center gap-2 text-secondary-text">
                    <span className="material-symbols-outlined text-lg">style</span>
                    <p className="text-sm font-bold uppercase tracking-wider">Đã Học</p>
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white text-3xl font-bold">
                      {progress ? `${progress.cards_studied}/${progress.total_cards}` : `0/${cards.length}`}
                    </p>
                    <p className="text-secondary-text text-sm font-medium mt-1">
                      {progress ? `${progress.cards_to_review} thẻ cần ôn` : `${cards.length} thẻ chưa học`}
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ 
                        width: `${progress && progress.total_cards > 0 
                          ? Math.min(100, Math.round((progress.cards_studied / progress.total_cards) * 100)) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Time/Streak Stat */}
                <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-primary">timer</span>
                  </div>
                  <div className="flex items-center gap-2 text-secondary-text">
                    <span className="material-symbols-outlined text-lg">local_fire_department</span>
                    <p className="text-sm font-bold uppercase tracking-wider">Chuỗi Học</p>
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white text-3xl font-bold">
                      {progress ? (progress.streak_days || 0) : 0} ngày
                    </p>
                    <p className="text-secondary-text text-sm font-medium mt-1">
                      {lastStudied 
                        ? `Lần học cuối: ${new Date(lastStudied).toLocaleDateString('vi-VN', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })}`
                        : 'Chưa học'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Flashcards List Section */}
              <div className="flex flex-col gap-4 mt-6">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Thẻ trong bộ này ({cards.length})</h3>
                </div>

                {/* Cards List */}
                {cards.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl">
                    Không có thẻ nào trong bộ này
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {cards.map((card, index) => (
                      <div key={card.id} className="group bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl p-6 shadow-sm hover:border-primary/50 dark:hover:border-primary/50 transition-all hover:shadow-md">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-base border-2 border-primary/20">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Thẻ {index + 1}</h4>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-base text-blue-600 dark:text-blue-400">help_outline</span>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mặt Trước</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-900/30 min-h-[80px] flex items-center">
                              <p className="text-slate-900 dark:text-white text-base leading-relaxed w-full">{card.front}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-base text-green-600 dark:text-green-400">check_circle</span>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mặt Sau</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-900/30 min-h-[80px] flex items-center">
                              <p className="text-slate-900 dark:text-white text-base leading-relaxed w-full">{card.back}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thêm Thẻ Mới</h2>
              <button
                onClick={() => {
                  setShowAddCardModal(false)
                  setNewCard({ front: '', back: '' })
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mặt Trước
                </label>
                <textarea
                  value={newCard.front}
                  onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows="3"
                  placeholder="Nhập nội dung mặt trước..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mặt Sau
                </label>
                <textarea
                  value={newCard.back}
                  onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows="3"
                  placeholder="Nhập nội dung mặt sau..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCardModal(false)
                    setNewCard({ front: '', back: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isAddingCard}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingCard ? 'Đang thêm...' : 'Thêm Thẻ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Set Info Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sửa Thông Tin Bộ Thẻ</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditData({ title: '', description: '', is_public: false })
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateSet} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tiêu Đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nhập tiêu đề bộ thẻ..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mô Tả
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows="4"
                  placeholder="Nhập mô tả bộ thẻ..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={editData.is_public}
                  onChange={(e) => setEditData({ ...editData, is_public: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_public" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Công khai (mọi người có thể xem và học)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditData({ title: '', description: '', is_public: false })
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Đang cập nhật...' : 'Cập Nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Nhập Flashcard</h2>
            <form onSubmit={handleFileImport} className="space-y-4">
              {/* Mode selector */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setImportMode('file')}
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    importMode === 'file'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('paste')}
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    importMode === 'paste'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Dán Nội Dung
                </button>
              </div>

              {/* File upload mode */}
              {importMode === 'file' && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Chọn file CSV hoặc JSON
                  </label>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white cursor-pointer"
                    required={importMode === 'file'}
                  />
                  {importFile && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Đã chọn: {importFile.name}
                    </p>
                  )}
                </div>
              )}

              {/* Paste mode */}
              {importMode === 'paste' && (
                <textarea
                  placeholder="Dán nội dung CSV hoặc JSON vào đây..."
                  value={importFileContent}
                  onChange={(e) => setImportFileContent(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  rows="10"
                  required={importMode === 'paste'}
                />
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg"
                >
                  Nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportFileContent('')
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

