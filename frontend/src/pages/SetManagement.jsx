import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import AdminSidebar from '../components/AdminSidebar'
import AdminHeader from '../components/AdminHeader'

export default function SetManagement() {
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sets, setSets] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSets, setSelectedSets] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    pendingReview: 0,
    totalSets: 0,
    reportedSets: 0
  })
  const setsPerPage = 5

  useEffect(() => {
    if (user && !authLoading) {
      fetchSets()
    } else if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, currentPage])

  const fetchSets = async () => {
    try {
      // Use admin endpoint to get all sets for management
      const response = await api.get('/api/admin/sets').catch(() => ({ data: [] }))
      const allSets = response.data || []

      // Get card counts for each set
      const setsWithCards = await Promise.all(
        allSets.map(async (set) => {
          try {
            const cardsRes = await api.get(`/api/flashcards/sets/${set.id}/cards`).catch(() => ({ data: [] }))
            return {
              ...set,
              card_count: cardsRes.data.length || 0,
              creator: set.owner_username || 'Unknown',
              status: set.is_public ? 'Approved' : 'Pending'
            }
          } catch {
            return {
              ...set,
              card_count: 0,
              creator: set.owner_username || 'Unknown',
              status: set.is_public ? 'Approved' : 'Pending'
            }
          }
        })
      )

      setSets(setsWithCards)
      
      // Calculate stats
      const pendingCount = setsWithCards.filter(s => s.status === 'Pending').length
      const reportedCount = 0 // Can be fetched from reports API
      
      setStats({
        pendingReview: pendingCount,
        totalSets: setsWithCards.length,
        reportedSets: reportedCount
      })
    } catch (error) {
      toast.error('Failed to load flashcard sets')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSets(paginatedSets.map(s => s.id))
    } else {
      setSelectedSets([])
    }
  }

  const handleSelectSet = (setId) => {
    setSelectedSets(prev =>
      prev.includes(setId)
        ? prev.filter(id => id !== setId)
        : [...prev, setId]
    )
  }

  const handleDelete = async (setId) => {
    if (window.confirm('Are you sure you want to delete this set?')) {
      try {
        await api.delete(`/api/flashcards/sets/${setId}`)
        toast.success('Set deleted successfully')
        fetchSets()
      } catch (error) {
        toast.error('Failed to delete set')
      }
    }
  }

  const handleApprove = async (setId) => {
    try {
      await api.put(`/api/flashcards/sets/${setId}`, { is_public: true })
      toast.success('Set approved')
      fetchSets()
    } catch (error) {
      toast.error('Failed to approve set')
    }
  }

  const handleReject = async (setId) => {
    try {
      await api.put(`/api/flashcards/sets/${setId}`, { is_public: false })
      toast.success('Set rejected')
      fetchSets()
    } catch (error) {
      toast.error('Failed to reject set')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toISOString().split('T')[0]
  }

  const filteredSets = sets.filter(set =>
    set.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    set.creator?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedSets = filteredSets.slice(
    (currentPage - 1) * setsPerPage,
    currentPage * setsPerPage
  )

  const totalPages = Math.ceil(filteredSets.length / setsPerPage)

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
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      <AdminHeader pageTitle="Set Management" />

      <div className="flex h-[calc(100vh-4rem)] grow">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex flex-col w-full max-w-7xl flex-1 gap-8">
          {/* PageHeading */}
          <div className="flex flex-wrap justify-between gap-4 items-center">
            <p className="text-black dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">
              Flashcard Set Management
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-white/10 bg-white/5">
              <p className="text-slate-400 text-base font-medium leading-normal">Pending Review</p>
              <p className="text-black dark:text-white tracking-light text-3xl font-bold leading-tight">
                {stats.pendingReview}
              </p>
            </div>
            <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-white/10 bg-white/5">
              <p className="text-slate-400 text-base font-medium leading-normal">Total Sets</p>
              <p className="text-black dark:text-white tracking-light text-3xl font-bold leading-tight">
                {stats.totalSets.toLocaleString()}
              </p>
            </div>
            <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-white/10 bg-white/5">
              <p className="text-slate-400 text-base font-medium leading-normal">Reported Sets</p>
              <p className="text-black dark:text-white tracking-light text-3xl font-bold leading-tight">
                {stats.reportedSets}
              </p>
            </div>
          </div>

          {/* Actions and Table */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap justify-between gap-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={() => toast.info('Filter functionality coming soon!')}
                  className="p-2.5 rounded-lg bg-white/5 text-black dark:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
                <button
                  onClick={() => toast.info('Sort functionality coming soon!')}
                  className="p-2.5 rounded-lg bg-white/5 text-black dark:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined">swap_vert</span>
                </button>
                <button
                  onClick={() => toast.info('Export functionality coming soon!')}
                  className="p-2.5 rounded-lg bg-white/5 text-black dark:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined">download</span>
                </button>
              </div>
              <button
                onClick={() => navigate('/sets/create')}
                className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-primary text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4 hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  add
                </span>
                <span className="truncate">Add New Set</span>
              </button>
            </div>

            {/* Table */}
            <div className="w-full">
              <div className="flex overflow-hidden rounded-xl border border-white/10 bg-background-light dark:bg-background-dark">
                <table className="flex-1 text-left">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-slate-400 w-12 text-sm font-medium leading-normal">
                        <input
                          className="h-5 w-5 rounded border-white/20 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0"
                          type="checkbox"
                          checked={selectedSets.length === paginatedSets.length && paginatedSets.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-slate-400 w-2/6 text-sm font-medium leading-normal">
                        Set Title
                      </th>
                      <th className="px-4 py-3 text-slate-400 w-1/6 text-sm font-medium leading-normal hidden md:table-cell">
                        Creator
                      </th>
                      <th className="px-4 py-3 text-slate-400 w-1/6 text-sm font-medium leading-normal hidden lg:table-cell">
                        Date Created
                      </th>
                      <th className="px-4 py-3 text-slate-400 w-[80px] text-sm font-medium leading-normal hidden sm:table-cell">
                        Cards
                      </th>
                      <th className="px-4 py-3 text-slate-400 w-[120px] text-sm font-medium leading-normal">
                        Status
                      </th>
                      <th className="px-4 py-3 text-slate-400 w-[120px] text-sm font-medium leading-normal">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSets.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                          No flashcard sets found
                        </td>
                      </tr>
                    ) : (
                      paginatedSets.map((set) => (
                        <tr key={set.id} className="border-t border-t-white/10 hover:bg-white/5">
                          <td className="h-[72px] px-4 py-2 w-12 text-center text-sm font-normal leading-normal">
                            <input
                              className="h-5 w-5 rounded border-white/20 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0"
                              type="checkbox"
                              checked={selectedSets.includes(set.id)}
                              onChange={() => handleSelectSet(set.id)}
                            />
                          </td>
                          <td className="h-[72px] px-4 py-2 w-2/6 text-black dark:text-white text-sm font-normal leading-normal">
                            {set.title}
                          </td>
                          <td className="h-[72px] px-4 py-2 w-1/6 text-slate-400 text-sm font-normal leading-normal hidden md:table-cell">
                            {set.creator}
                          </td>
                          <td className="h-[72px] px-4 py-2 w-1/6 text-slate-400 text-sm font-normal leading-normal hidden lg:table-cell">
                            {formatDate(set.created_at)}
                          </td>
                          <td className="h-[72px] px-4 py-2 w-[80px] text-slate-400 text-sm font-normal leading-normal hidden sm:table-cell">
                            {set.card_count}
                          </td>
                          <td className="h-[72px] px-4 py-2 w-[120px] text-sm font-normal leading-normal">
                            <div
                              className={`flex items-center gap-2 text-sm font-medium rounded-full py-1 px-3 w-fit ${
                                set.status === 'Approved'
                                  ? 'bg-green-500/10 text-green-400'
                                  : set.status === 'Pending'
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : 'bg-red-500/10 text-red-400'
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  set.status === 'Approved'
                                    ? 'bg-green-400'
                                    : set.status === 'Pending'
                                    ? 'bg-yellow-400'
                                    : 'bg-red-400'
                                }`}
                              ></span>
                              {set.status}
                            </div>
                          </td>
                          <td className="h-[72px] px-4 py-2 w-[120px]">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/sets/${set.id}`)}
                                className="text-primary text-sm font-bold leading-normal tracking-[0.015em] cursor-pointer hover:underline"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDelete(set.id)}
                                className="text-red-500 text-sm font-medium hover:underline"
                              >
                                Delete
                              </button>
                              {set.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(set.id)}
                                    className="text-green-400 text-sm font-medium hover:underline"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(set.id)}
                                    className="text-red-400 text-sm font-medium hover:underline"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
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
            <div className="flex justify-between items-center py-4 text-sm text-slate-400">
              <p>
                Showing {(currentPage - 1) * setsPerPage + 1} to {Math.min(currentPage * setsPerPage, filteredSets.length)} of {filteredSets.length} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page
                  if (totalPages <= 5) {
                    page = i + 1
                  } else if (currentPage <= 3) {
                    page = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i
                  } else {
                    page = currentPage - 2 + i
                  }
                  
                  if (page > totalPages) return null
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`flex items-center justify-center h-9 w-9 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-primary text-white'
                          : 'bg-white/5 hover:bg-white/10 text-black dark:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="text-black dark:text-white">...</span>
                )}
                {totalPages > 5 && (
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`flex items-center justify-center h-9 w-9 rounded-lg transition-colors ${
                      currentPage === totalPages
                        ? 'bg-primary text-white'
                        : 'bg-white/5 hover:bg-white/10 text-black dark:text-white'
                    }`}
                  >
                    {totalPages}
                  </button>
                )}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}

