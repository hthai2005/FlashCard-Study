import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import AdminSidebar from '../components/AdminSidebar'
import AdminHeader from '../components/AdminHeader'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'

export default function ViewSet() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [setInfo, setSetInfo] = useState(null)
  const [cards, setCards] = useState([])
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [newCard, setNewCard] = useState({ front: '', back: '' })
  const [isAddingCard, setIsAddingCard] = useState(false)
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
      const [setRes, cardsRes] = await Promise.all([
        api.get(`/api/flashcards/sets/${id}`).catch((err) => {
          console.error('Error fetching set:', err)
          return { data: null }
        }),
        api.get(`/api/flashcards/sets/${id}/cards`).catch((err) => {
          console.error('Error fetching cards:', err)
          return { data: [] }
        })
      ])

      if (setRes.data) {
        setSetInfo(setRes.data)
        setCards(cardsRes.data || [])
      } else {
        const errorMessage = setRes.error?.response?.data?.detail || 'Flashcard set not found'
        toast.error(errorMessage)
        // Don't navigate immediately, let user see the error
      }
    } catch (error) {
      console.error('Error fetching set data:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to load flashcard set'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
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
    } catch (error) {
      console.error('Error adding card:', error)
      toast.error(error.response?.data?.detail || 'Không thể thêm thẻ')
    } finally {
      setIsAddingCard(false)
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
<<<<<<< HEAD
                Quay Lại Danh Sách
=======
                Về Bộ Thẻ
>>>>>>> 0b2d28d8543ea39bd4791f8a41b5e9c34f5e3808
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
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setShowAddCardModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <span className="material-symbols-outlined">add</span>
                      <span>Thêm Thẻ</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cards List */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {cards.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Không có thẻ nào trong bộ này
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cards.map((card, index) => (
                      <div key={card.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mặt Trước</p>
                              <p className="text-gray-900 dark:text-white text-base">{card.front}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mặt Sau</p>
                              <p className="text-gray-900 dark:text-white text-base">{card.back}</p>
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
    <div className="relative flex min-h-screen w-full bg-background-light dark:bg-background-dark">
      <Sidebar />
      <TopNav />

      <main className="flex-1 flex flex-col overflow-y-auto pt-20">
        <div className="p-8">
          {!setInfo ? (
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center min-h-[400px]">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Flashcard set not found</p>
              <button
                onClick={() => navigate('/sets')}
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
                  onClick={() => navigate('/sets')}
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
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setShowAddCardModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <span className="material-symbols-outlined">add</span>
                      <span>Thêm Thẻ</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cards List */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {cards.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Không có thẻ nào trong bộ này
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cards.map((card, index) => (
                      <div key={card.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mặt Trước</p>
                              <p className="text-gray-900 dark:text-white text-base">{card.front}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mặt Sau</p>
                              <p className="text-gray-900 dark:text-white text-base">{card.back}</p>
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

