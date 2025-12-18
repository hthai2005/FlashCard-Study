import { useEffect, useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TopNav from '../components/TopNav'
import ReportButton from '../components/ReportButton'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Sets() {
  const { user, loading: authLoading } = useAuth()
  const [sets, setSets] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [newSet, setNewSet] = useState({ title: '', description: '', is_public: false })
  const [importData, setImportData] = useState({ set_id: null, file_content: '', title: '', description: '', is_public: false })
  const [importFile, setImportFile] = useState(null)
  const [importMode, setImportMode] = useState('file') // 'file' or 'paste'
  const [importToNewSet, setImportToNewSet] = useState(true) // true = tạo mới, false = import vào set có sẵn
  const [aiData, setAiData] = useState({ topic: '', number_of_cards: 10, difficulty: 'medium' })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('last-studied')
  const [loading, setLoading] = useState(true)
  const [cardCounts, setCardCounts] = useState({})
  const [masteryData, setMasteryData] = useState({})
  const [lastStudiedData, setLastStudiedData] = useState({}) // Store last studied date for each set
  const navigate = useNavigate()
  const location = useLocation()

  // Refresh data when component mounts or when navigating back from study page
  useEffect(() => {
    if (user && !authLoading) {
      fetchSets()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading, location.pathname]) // Add location.pathname to refresh when navigating

  // Auto-refresh sets every 30 seconds to catch new sets from other users
  useEffect(() => {
    if (!user || authLoading || location.pathname !== '/sets') return

    const interval = setInterval(() => {
      fetchSets()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [user, authLoading, location.pathname])

  // Listen for study progress updates
  useEffect(() => {
    const handleStudyProgressUpdate = (event) => {
      // Refresh mastery data when study progress is updated
      // Add a small delay to ensure backend has committed the changes
      setTimeout(() => {
        if (sets.length > 0) {
          const fetchMasteryAndLastStudied = async () => {
            const mastery = {}
            for (const set of sets) {
              try {
                const progressRes = await api.get(`/api/study/progress/${set.id}`).catch(() => null)
                if (progressRes && progressRes.data) {
                  const { total_cards, cards_correct } = progressRes.data
                  // Calculate mastery based on cards answered correctly / total cards
                  if (total_cards > 0 && cards_correct !== undefined && cards_correct !== null) {
                    mastery[set.id] = Math.round((cards_correct / total_cards) * 100)
                  } else {
                    mastery[set.id] = 0
                  }
                } else {
                  mastery[set.id] = 0
                }
              } catch (error) {
                console.error(`Error fetching progress for set ${set.id}:`, error)
                mastery[set.id] = 0
              }
            }
            setMasteryData(prev => ({ ...prev, ...mastery }))
          }
          fetchMasteryAndLastStudied()
        }
      }, 500) // Small delay to ensure backend has committed
    }

    window.addEventListener('studyProgressUpdated', handleStudyProgressUpdate)
    return () => {
      window.removeEventListener('studyProgressUpdated', handleStudyProgressUpdate)
    }
  }, [sets])

  // Refresh mastery and last studied when navigating back to /sets
  useEffect(() => {
    if (user && !authLoading && location.pathname === '/sets' && sets.length > 0) {
      // Force refresh mastery and last studied data
      const fetchMasteryAndLastStudied = async () => {
        const mastery = {}
        const lastStudied = {}
        
        // Initialize all sets with 0% mastery and null last studied
        for (const set of sets) {
          mastery[set.id] = 0
          lastStudied[set.id] = null
        }
        
        // Then fetch actual progress and last studied for each set
        for (const set of sets) {
          try {
            // Fetch progress data
            const progressRes = await api.get(`/api/study/progress/${set.id}`).catch(() => null)
            if (progressRes && progressRes.data) {
              const { total_cards, cards_correct } = progressRes.data
              // Calculate mastery based on cards answered correctly / total cards
              // Example: 1 card answered correctly out of 5 = 20%
              console.log(`Set ${set.id} (${set.title}): total_cards=${total_cards}, cards_correct=${cards_correct}`)
              if (total_cards > 0 && cards_correct !== undefined && cards_correct !== null) {
                mastery[set.id] = Math.round((cards_correct / total_cards) * 100)
              } else {
                mastery[set.id] = 0
              }
            } else {
              mastery[set.id] = 0
            }
          } catch (error) {
            console.error(`Error fetching progress for set ${set.id}:`, error)
            mastery[set.id] = 0
          }
        }
        setMasteryData(mastery)
        
        // Fetch last studied dates for all sets at once
        try {
          const lastStudiedRes = await api.get('/api/study/sets/last-studied').catch(() => ({ data: {} }))
          if (lastStudiedRes && lastStudiedRes.data) {
            const lastStudiedMap = {}
            for (const set of sets) {
              if (lastStudiedRes.data[set.id]) {
                lastStudiedMap[set.id] = new Date(lastStudiedRes.data[set.id])
              } else {
                lastStudiedMap[set.id] = null
              }
            }
            setLastStudiedData(lastStudiedMap)
          } else {
            setLastStudiedData({})
          }
        } catch (error) {
          console.error('Error fetching last studied dates:', error)
          setLastStudiedData({})
        }
      }
      fetchMasteryAndLastStudied()
    }
  }, [location.pathname, sets, user, authLoading])

  // Also refresh when window gains focus (user might have studied in another tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user && !authLoading && location.pathname === '/sets' && sets.length > 0) {
        // Refresh mastery data when window gains focus
        const fetchMasteryAndLastStudied = async () => {
          const mastery = {}
          const lastStudied = {}
          
          for (const set of sets) {
            mastery[set.id] = 0
            lastStudied[set.id] = null
          }
          
          for (const set of sets) {
            try {
              const progressRes = await api.get(`/api/study/progress/${set.id}`).catch(() => null)
              if (progressRes && progressRes.data) {
                const { total_cards, cards_studied } = progressRes.data
                if (total_cards > 0 && cards_studied !== undefined) {
                  mastery[set.id] = Math.round((cards_studied / total_cards) * 100)
                } else {
                  mastery[set.id] = 0
                }
              } else {
                mastery[set.id] = 0
              }
            } catch (error) {
              mastery[set.id] = 0
            }
          }
          setMasteryData(mastery)
          
          try {
            const lastStudiedRes = await api.get('/api/study/sets/last-studied').catch(() => ({ data: {} }))
            if (lastStudiedRes && lastStudiedRes.data) {
              const lastStudiedMap = {}
              for (const set of sets) {
                if (lastStudiedRes.data[set.id]) {
                  lastStudiedMap[set.id] = new Date(lastStudiedRes.data[set.id])
                } else {
                  lastStudiedMap[set.id] = null
                }
              }
              setLastStudiedData(lastStudiedMap)
            }
          } catch (error) {
            console.error('Error fetching last studied dates:', error)
          }
        }
        fetchMasteryAndLastStudied()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, authLoading, location.pathname, sets])

  useEffect(() => {
    const fetchCardCounts = async () => {
      const counts = {}
      for (const set of sets) {
        try {
          const response = await api.get(`/api/flashcards/sets/${set.id}/cards`)
          counts[set.id] = response.data.length
        } catch {
          counts[set.id] = 0
        }
      }
      setCardCounts(counts)
    }
    if (sets.length > 0) {
      fetchCardCounts()
    } else {
      setCardCounts({})
    }
  }, [sets])

  useEffect(() => {
    const fetchMasteryAndLastStudied = async () => {
      const mastery = {}
      const lastStudied = {}
      
      // Initialize all sets with 0% mastery and null last studied
      for (const set of sets) {
        mastery[set.id] = 0
        lastStudied[set.id] = null
      }
      
      // Then fetch actual progress and last studied for each set
      for (const set of sets) {
        try {
          // Fetch progress data
          const progressRes = await api.get(`/api/study/progress/${set.id}`).catch(() => null)
          if (progressRes && progressRes.data) {
            const { total_cards, cards_correct } = progressRes.data
            // Calculate mastery based on cards answered correctly / total cards
            // Example: 1 card answered correctly out of 5 = 20%
            if (total_cards > 0 && cards_correct !== undefined && cards_correct !== null) {
              mastery[set.id] = Math.round((cards_correct / total_cards) * 100)
            } else {
              // Deck exists but has no cards yet or user hasn't answered any correctly - show 0%
              mastery[set.id] = 0
            }
          } else {
            // No progress data - deck might be new or have no cards - show 0%
            mastery[set.id] = 0
          }
          
          // Fetch last studied date will be done separately for all sets at once
        } catch (error) {
          // Error fetching progress - show 0%
          console.error(`Error fetching progress for set ${set.id}:`, error)
          mastery[set.id] = 0
        }
      }
      setMasteryData(mastery)
      
      // Fetch last studied dates for all sets at once
      try {
        const lastStudiedRes = await api.get('/api/study/sets/last-studied').catch(() => ({ data: {} }))
        if (lastStudiedRes && lastStudiedRes.data) {
          const lastStudiedMap = {}
          for (const set of sets) {
            if (lastStudiedRes.data[set.id]) {
              lastStudiedMap[set.id] = new Date(lastStudiedRes.data[set.id])
            } else {
              lastStudiedMap[set.id] = null
            }
          }
          setLastStudiedData(lastStudiedMap)
        } else {
          setLastStudiedData({})
        }
      } catch (error) {
        console.error('Error fetching last studied dates:', error)
        setLastStudiedData({})
      }
    }
    if (sets.length > 0) {
      fetchMasteryAndLastStudied()
    } else {
      // If no sets, clear data
      setMasteryData({})
      setLastStudiedData({})
    }
  }, [sets])

  const fetchSets = async () => {
    try {
      setLoading(true)
      // Get only current user's sets (not public sets from others)
      const response = await api.get('/api/flashcards/sets')
      setSets(response.data || [])
      
      // Fetch card counts for all sets
      const counts = {}
      for (const set of response.data || []) {
        try {
          const cardsRes = await api.get(`/api/flashcards/sets/${set.id}/cards`).catch(() => ({ data: [] }))
          counts[set.id] = cardsRes.data?.length || 0
        } catch (err) {
          counts[set.id] = 0
        }
      }
      setCardCounts(counts)
    } catch (error) {
      console.error('Error fetching sets:', error)
      toast.error('Không thể tải danh sách bộ thẻ')
      setSets([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSet = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/flashcards/sets', newSet)
      toast.success('Đã tạo bộ thẻ thành công!')
      setShowCreateModal(false)
      setNewSet({ title: '', description: '', is_public: false })
      fetchSets()
    } catch (error) {
      toast.error('Không thể tạo bộ thẻ')
    }
  }

  const handleDeleteSet = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa bộ thẻ này?')) return
    try {
      await api.delete(`/api/flashcards/sets/${id}`)
      toast.success('Đã xóa bộ thẻ')
      fetchSets()
    } catch (error) {
      toast.error('Không thể xóa bộ thẻ')
    }
  }

  const handleFileImport = async (e) => {
    e.preventDefault()
    
    // Validate
    if (importToNewSet) {
      if (!importData.title.trim()) {
        toast.error('Vui lòng nhập tên bộ thẻ')
        return
      }
    } else {
      if (!importData.set_id) {
        toast.error('Vui lòng chọn một bộ thẻ')
        return
      }
    }
    
    try {
      if (importMode === 'file' && importFile) {
        // Upload file
        const formData = new FormData()
        formData.append('file', importFile)
        
        if (importToNewSet) {
          formData.append('title', importData.title)
          formData.append('description', importData.description || '')
          formData.append('is_public', importData.is_public ? 'true' : 'false')
        } else {
          formData.append('set_id', importData.set_id.toString())
        }
        
        const response = await api.post('/api/ai/import/file', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        toast.success(`Đã nhập ${response.data.count} flashcard thành công!`)
        
        // If created new set, navigate to it
        if (importToNewSet && response.data.set_id) {
          setShowImportModal(false)
          setImportData({ set_id: null, file_content: '', title: '', description: '', is_public: false })
          setImportFile(null)
          setImportToNewSet(true)
          // Navigate to the new set
          navigate(`/sets/${response.data.set_id}`)
          return
        }
      } else if (importMode === 'paste' && importData.file_content) {
        // Paste content
        const payload = importToNewSet ? {
          title: importData.title,
          description: importData.description || '',
          is_public: importData.is_public,
          file_content: importData.file_content
        } : {
          set_id: importData.set_id,
          file_content: importData.file_content
        }
        
        const response = await api.post('/api/ai/import', payload)
        toast.success(`Đã nhập ${response.data.count} flashcard thành công!`)
        
        // If created new set, navigate to it
        if (importToNewSet && response.data.set_id) {
          setShowImportModal(false)
          setImportData({ set_id: null, file_content: '', title: '', description: '', is_public: false })
          setImportFile(null)
          setImportToNewSet(true)
          // Navigate to the new set
          navigate(`/sets/${response.data.set_id}`)
          return
        }
      } else {
        toast.error('Vui lòng chọn file hoặc dán nội dung')
        return
      }
      
      // If importing to existing set, just refresh
      setShowImportModal(false)
      setImportData({ set_id: null, file_content: '', title: '', description: '', is_public: false })
      setImportFile(null)
      setImportToNewSet(true)
      fetchSets()
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

  const handleAIGenerate = async (e) => {
    e.preventDefault()
    if (!aiData.topic) {
      toast.error('Vui lòng nhập chủ đề')
      return
    }
    try {
      const response = await api.post('/api/ai/generate', aiData)
      const flashcards = response.data.flashcards
      
      const setResponse = await api.post('/api/flashcards/sets', {
        title: `AI Generated: ${aiData.topic}`,
        description: `Generated ${aiData.number_of_cards} flashcards about ${aiData.topic}`,
        is_public: false
      })
      
      for (const card of flashcards) {
        await api.post(`/api/flashcards/sets/${setResponse.data.id}/cards`, card)
      }
      
      toast.success(`Đã tạo và thêm ${flashcards.length} flashcard!`)
      setShowAIModal(false)
      setAiData({ topic: '', number_of_cards: 10, difficulty: 'medium' })
      fetchSets()
    } catch (error) {
      toast.error('Không thể tạo flashcard')
    }
  }

  const getMasteryColor = (mastery) => {
    const masteryValue = typeof mastery === 'number' ? mastery : 0
    if (masteryValue >= 80) return 'bg-green-500'
    if (masteryValue >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Separate sets into "My Sets" and "Other Users' Sets"
  const mySets = sets.filter(set => user && set.owner_id === user.id)
  const otherSets = sets.filter(set => user && set.owner_id !== user.id)

  // Filter by search query
  const filteredMySets = mySets.filter(set =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredOtherSets = otherSets.filter(set =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort function
  const sortSets = (setsToSort) => {
    let sorted = [...setsToSort]
    if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else {
      // Sort by last studied
      sorted.sort((a, b) => {
        const aLastStudied = lastStudiedData[a.id]
        const bLastStudied = lastStudiedData[b.id]
        
        if (aLastStudied && bLastStudied) {
          return bLastStudied - aLastStudied
        }
        if (aLastStudied && !bLastStudied) {
          return -1
        }
        if (!aLastStudied && bLastStudied) {
          return 1
        }
        return new Date(b.created_at) - new Date(a.created_at)
      })
    }
    return sorted
  }

  const sortedMySets = sortSets(filteredMySets)
  const sortedOtherSets = sortSets(filteredOtherSets)

  // Render set card component
  const renderSetCard = (set) => {
    const cardCount = cardCounts[set.id] || 0
    const mastery = typeof masteryData[set.id] === 'number' ? masteryData[set.id] : 0
    const masteryColor = getMasteryColor(mastery)
    const isOwner = user && set.owner_id === user.id
    
    return (
      <div
        key={set.id}
        className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50 transition-all group"
      >
        <div className="w-full bg-gradient-to-br from-primary-400 via-purple-500 to-pink-500 aspect-video rounded-lg relative">
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-slate-900 dark:text-white text-base font-bold flex-1">
              {set.title}
            </p>
            {set.status === 'pending' && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                Đợi Duyệt
              </span>
            )}
            {!isOwner && set.is_public && set.status === 'approved' && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                Công khai
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {cardCount} Thẻ
            </p>
            {!isOwner && set.owner_username && (
              <>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <div className="flex items-center gap-1.5">
                  {set.owner_avatar_url ? (
                    <img
                      src={set.owner_avatar_url.startsWith('http') ? set.owner_avatar_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${set.owner_avatar_url}`}
                      alt={set.owner_username}
                      className="w-4 h-4 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextElementSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-4 h-4 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-semibold ${set.owner_avatar_url ? 'hidden' : ''}`}
                    style={{ display: set.owner_avatar_url ? 'none' : 'flex' }}
                  >
                    {set.owner_username.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Bởi {set.owner_username}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>Thành Thạo</span>
            <span>{mastery}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className={`${masteryColor} h-1.5 rounded-full transition-all`}
              style={{ width: `${Math.max(0, Math.min(100, mastery))}%` }}
            ></div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => navigate(`/sets/${set.id}`)}
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            <span>Xem</span>
          </button>
          <button
            onClick={() => {
              if (set.status === 'pending' && !user?.is_admin) {
                toast.error('Bộ thẻ này đang chờ admin duyệt. Vui lòng đợi admin duyệt trước khi học.')
                return
              }
              navigate(`/study/${set.id}`)
            }}
            disabled={set.status === 'pending' && !user?.is_admin}
            className={`flex flex-1 items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-bold transition-colors ${
              set.status === 'pending' && !user?.is_admin
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            <span className="material-symbols-outlined">
              {set.status === 'pending' && !user?.is_admin ? 'hourglass_empty' : 'style'}
            </span>
            <span>{set.status === 'pending' && !user?.is_admin ? 'Đợi Duyệt' : 'Học'}</span>
          </button>
          {isOwner ? (
            <button
              onClick={() => handleDeleteSet(set.id)}
              className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          ) : (
            set.is_public && (
              <ReportButton
                itemType="deck"
                itemId={set.id}
                ownerId={set.owner_id}
                itemTitle={set.title}
              />
            )
          )}
        </div>
      </div>
    )
  }

  if (authLoading || (user && loading)) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <TopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <TopNav />
      <main className="container mx-auto flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-6">
          {user && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-[-0.033em]">
                  Bộ Thẻ
                </h1>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-green-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-green-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base mr-1">upload_file</span>
                    <span className="truncate">Nhập Flashcard</span>
                  </button>
                  <Link
                    to="/sets/create"
                    className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                  >
                    <span className="truncate">Tạo Bộ Thẻ Mới</span>
                  </Link>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                  <label className="flex flex-col min-w-40 h-12 w-full">
                    <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                      <div className="text-slate-400 dark:text-slate-500 flex border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg border-y border-l">
                        <span className="material-symbols-outlined">search</span>
                      </div>
                      <input
                        className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-full placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 text-base font-normal"
                        placeholder="Tìm kiếm bộ thẻ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </label>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => setSortBy('last-studied')}
                    className={`flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg border px-4 transition-colors ${
                      sortBy === 'last-studied'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <p className={`text-sm font-medium ${
                      sortBy === 'last-studied'
                        ? 'text-primary'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      Lần Học Cuối
                    </p>
                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">expand_more</span>
                  </button>
                  <button
                    onClick={() => setSortBy('alphabetical')}
                    className={`flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg border px-4 transition-colors ${
                      sortBy === 'alphabetical'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <p className={`text-sm font-medium ${
                      sortBy === 'alphabetical'
                        ? 'text-primary'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      Theo Bảng Chữ Cái
                    </p>
                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">expand_more</span>
                  </button>
                </div>
              </div>

              {/* My Sets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Bộ Thẻ Của Tôi
                  </h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {sortedMySets.length} bộ thẻ
                  </span>
                </div>
                {sortedMySets.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Bạn chưa có bộ thẻ nào</p>
                    <Link
                      to="/sets/create"
                      className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
                    >
                      <span className="material-symbols-outlined">add</span>
                      Tạo Bộ Thẻ Đầu Tiên
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedMySets.map((set) => renderSetCard(set))}
                  </div>
                )}
              </div>

              {/* Other Users' Sets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Bộ Thẻ Của Người Khác
                  </h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {sortedOtherSets.length} bộ thẻ công khai
                  </span>
                </div>
                {sortedOtherSets.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-gray-500 dark:text-gray-400">
                      Chưa có bộ thẻ công khai nào từ người dùng khác
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedOtherSets.map((set) => renderSetCard(set))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Tạo Bộ Thẻ Mới</h2>
            <form onSubmit={handleCreateSet} className="space-y-4">
              <input
                type="text"
                placeholder="Tiêu Đề"
                value={newSet.title}
                onChange={(e) => setNewSet({ ...newSet, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <textarea
                placeholder="Mô Tả"
                value={newSet.description}
                onChange={(e) => setNewSet({ ...newSet, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                rows="3"
              />
              <label className="flex items-center text-gray-900 dark:text-white">
                <input
                  type="checkbox"
                  checked={newSet.is_public}
                  onChange={(e) => setNewSet({ ...newSet, is_public: e.target.checked })}
                  className="mr-2"
                />
                Công Khai
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg"
                >
                  Tạo
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Nhập Flashcard</h2>
            {sets.length === 0 ? (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Bạn chưa có bộ thẻ nào. Vui lòng tạo bộ thẻ trước khi nhập flashcard.
                </p>
                <div className="flex gap-2">
                  <Link
                    to="/sets/create"
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-center"
                  >
                    Tạo Bộ Thẻ Mới
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFileImport} className="space-y-4">
                {/* Import mode: New set or Existing set */}
                <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="importTo"
                      checked={importToNewSet}
                      onChange={() => setImportToNewSet(true)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tạo Bộ Thẻ Mới</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="importTo"
                      checked={!importToNewSet}
                      onChange={() => setImportToNewSet(false)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Import Vào Bộ Thẻ Có Sẵn</span>
                  </label>
                </div>

                {/* New Set Form */}
                {importToNewSet ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tên Bộ Thẻ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={importData.title}
                        onChange={(e) => setImportData({ ...importData, title: e.target.value })}
                        placeholder="Nhập tên bộ thẻ..."
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mô Tả
                      </label>
                      <textarea
                        value={importData.description}
                        onChange={(e) => setImportData({ ...importData, description: e.target.value })}
                        placeholder="Nhập mô tả (tùy chọn)..."
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        rows="2"
                      />
                    </div>
                    <label className="flex items-center text-gray-900 dark:text-white">
                      <input
                        type="checkbox"
                        checked={importData.is_public}
                        onChange={(e) => setImportData({ ...importData, is_public: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm">Công Khai (mọi người đều thấy)</span>
                    </label>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Chọn bộ thẻ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={importData.set_id || ''}
                      onChange={(e) => setImportData({ ...importData, set_id: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required={!importToNewSet}
                    >
                      <option value="">-- Chọn một bộ thẻ --</option>
                      {sets.map((set) => (
                        <option key={set.id} value={set.id}>
                          {set.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              
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
                  value={importData.file_content}
                  onChange={(e) => setImportData({ ...importData, file_content: e.target.value })}
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
                    setImportData({ set_id: null, file_content: '', title: '', description: '', is_public: false })
                    setImportFile(null)
                    setImportToNewSet(true)
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Hủy
                </button>
              </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Tạo Flashcard Bằng AI</h2>
            <form onSubmit={handleAIGenerate} className="space-y-4">
              <input
                type="text"
                placeholder="Chủ Đề"
                value={aiData.topic}
                onChange={(e) => setAiData({ ...aiData, topic: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <input
                type="number"
                placeholder="Số lượng thẻ"
                value={aiData.number_of_cards}
                onChange={(e) => setAiData({ ...aiData, number_of_cards: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                min="1"
                max="50"
                required
              />
              <select
                value={aiData.difficulty}
                onChange={(e) => setAiData({ ...aiData, difficulty: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung Bình</option>
                <option value="hard">Khó</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg"
                >
                  Tạo
                </button>
                <button
                  type="button"
                  onClick={() => setShowAIModal(false)}
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
