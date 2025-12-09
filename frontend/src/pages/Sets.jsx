import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Sets() {
  const { user, loading: authLoading } = useAuth()
  const [sets, setSets] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [newSet, setNewSet] = useState({ title: '', description: '', is_public: false })
  const [importData, setImportData] = useState({ set_id: null, file_content: '' })
  const [aiData, setAiData] = useState({ topic: '', number_of_cards: 10, difficulty: 'medium' })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('last-studied')
  const [loading, setLoading] = useState(true)
  const [cardCounts, setCardCounts] = useState({})
  const [masteryData, setMasteryData] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !authLoading) {
      fetchSets()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

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
    }
  }, [sets])

  useEffect(() => {
    const fetchMastery = async () => {
      const mastery = {}
      for (const set of sets) {
        try {
          const progressRes = await api.get(`/api/study/progress/${set.id}`).catch(() => null)
          if (progressRes && progressRes.data) {
            const { total_cards, cards_mastered } = progressRes.data
            mastery[set.id] = total_cards > 0 ? Math.round((cards_mastered / total_cards) * 100) : 0
          } else {
            mastery[set.id] = 0
          }
        } catch {
          mastery[set.id] = 0
        }
      }
      setMasteryData(mastery)
    }
    if (sets.length > 0) {
      fetchMastery()
    }
  }, [sets])

  const fetchSets = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/flashcards/sets')
      setSets(response.data)
    } catch (error) {
      toast.error('Failed to load flashcard sets')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSet = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/flashcards/sets', newSet)
      toast.success('Flashcard set created!')
      setShowCreateModal(false)
      setNewSet({ title: '', description: '', is_public: false })
      fetchSets()
    } catch (error) {
      toast.error('Failed to create set')
    }
  }

  const handleDeleteSet = async (id) => {
    if (!window.confirm('Are you sure you want to delete this set?')) return
    try {
      await api.delete(`/api/flashcards/sets/${id}`)
      toast.success('Set deleted')
      fetchSets()
    } catch (error) {
      toast.error('Failed to delete set')
    }
  }

  const handleFileImport = async (e) => {
    e.preventDefault()
    if (!importData.set_id) {
      toast.error('Please select a set')
      return
    }
    try {
      await api.post('/api/ai/import', importData)
      toast.success('Flashcards imported successfully!')
      setShowImportModal(false)
      setImportData({ set_id: null, file_content: '' })
      fetchSets()
    } catch (error) {
      toast.error('Failed to import flashcards')
    }
  }

  const handleAIGenerate = async (e) => {
    e.preventDefault()
    if (!aiData.topic) {
      toast.error('Please enter a topic')
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
      
      toast.success(`Generated and added ${flashcards.length} flashcards!`)
      setShowAIModal(false)
      setAiData({ topic: '', number_of_cards: 10, difficulty: 'medium' })
      fetchSets()
    } catch (error) {
      toast.error('Failed to generate flashcards')
    }
  }

  const getMasteryColor = (mastery) => {
    if (mastery >= 80) return 'bg-green-500'
    if (mastery >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const filteredSets = sets.filter(set =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  let sortedSets = [...filteredSets]
  if (sortBy === 'alphabetical') {
    sortedSets.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortBy === 'oldest') {
    sortedSets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } else {
    sortedSets.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
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
                  My Decks
                </h1>
                <Link
                  to="/sets/create"
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                >
                  <span className="truncate">Create New Deck</span>
                </Link>
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
                        placeholder="Search my decks..."
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
                      Last Studied
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
                      Alphabetical
                    </p>
                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">expand_more</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedSets.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No flashcard sets found</p>
                    <Link
                      to="/sets/create"
                      className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
                    >
                      <span className="material-symbols-outlined">add</span>
                      Create Your First Set
                    </Link>
                  </div>
                ) : (
                  sortedSets.map((set) => {
                    const cardCount = cardCounts[set.id] || 0
                    const mastery = masteryData[set.id] || 0
                    const masteryColor = getMasteryColor(mastery)
                    
                    return (
                      <div
                        key={set.id}
                        className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50 transition-all group"
                      >
                        <div className="w-full bg-gradient-to-br from-primary-400 via-purple-500 to-pink-500 aspect-video rounded-lg"></div>
                        <div className="flex-1">
                          <p className="text-slate-900 dark:text-white text-base font-bold">
                            {set.title}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {cardCount} Cards
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                            <span>Mastery</span>
                            <span>{mastery}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div
                              className={`${masteryColor} h-1.5 rounded-full transition-all`}
                              style={{ width: `${mastery}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => navigate(`/sets/${set.id}`)}
                            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => navigate(`/study/${set.id}`)}
                            className="flex flex-1 items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                          >
                            <span className="material-symbols-outlined">style</span>
                            <span>Study</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSet(set.id)}
                            className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
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
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Create New Set</h2>
            <form onSubmit={handleCreateSet} className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={newSet.title}
                onChange={(e) => setNewSet({ ...newSet, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <textarea
                placeholder="Description"
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
                Public
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Import Flashcards</h2>
            <form onSubmit={handleFileImport} className="space-y-4">
              <select
                value={importData.set_id || ''}
                onChange={(e) => setImportData({ ...importData, set_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select a set</option>
                {sets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Paste CSV or JSON content here..."
                value={importData.file_content}
                onChange={(e) => setImportData({ ...importData, file_content: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                rows="10"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg"
                >
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">AI Generate Flashcards</h2>
            <form onSubmit={handleAIGenerate} className="space-y-4">
              <input
                type="text"
                placeholder="Topic"
                value={aiData.topic}
                onChange={(e) => setAiData({ ...aiData, topic: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <input
                type="number"
                placeholder="Number of cards"
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
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg"
                >
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => setShowAIModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
