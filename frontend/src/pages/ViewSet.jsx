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
  const isAdmin = user?.is_admin || false
  const isAdminPage = location.pathname.startsWith('/admin')

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
        api.get(`/api/flashcards/sets/${id}`).catch(() => ({ data: null })),
        api.get(`/api/flashcards/sets/${id}/cards`).catch(() => ({ data: [] }))
      ])

      if (setRes.data) {
        setSetInfo(setRes.data)
      } else {
        toast.error('Flashcard set not found')
        navigate(isAdmin ? '/admin/sets' : '/sets')
        return
      }

      setCards(cardsRes.data || [])
    } catch (error) {
      console.error('Error fetching set data:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to load flashcard set'
      toast.error(errorMessage)
      navigate(isAdmin ? '/admin/sets' : '/sets')
    } finally {
      setLoading(false)
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

  if (!setInfo) {
    return null
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background-light dark:bg-background-dark">
      {isAdmin ? <AdminSidebar /> : <Sidebar />}
      {!isAdmin && <TopNav />}

      <main className={`flex-1 flex flex-col overflow-y-auto ${!isAdmin ? 'pt-20' : ''}`}>
        {isAdmin && <AdminHeader pageTitle={setInfo?.title || 'View Set'} />}
        <div className="p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate(isAdmin ? '/admin/sets' : '/sets')}
              className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Back to Sets</span>
            </button>
            <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              {setInfo.title}
            </h1>
            {setInfo.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">{setInfo.description}</p>
            )}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Created: {new Date(setInfo.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>Cards: {cards.length}</span>
              <span>•</span>
              <span className={`${setInfo.is_public ? 'text-green-500' : 'text-yellow-500'}`}>
                {setInfo.is_public ? 'Public' : 'Private'}
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {cards.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No flashcards in this set
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
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Front</p>
                          <p className="text-gray-900 dark:text-white text-base">{card.front}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Back</p>
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
        </div>
      </main>
    </div>
  )
}

