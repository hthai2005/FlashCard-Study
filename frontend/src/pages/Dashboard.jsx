import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [sets, setSets] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('7days')
  const [stats, setStats] = useState({
    streak: 0,
    totalMastered: 0,
    accuracy: 0,
    dailyGoal: 20,
    dailyProgress: 0
  })
  const [deckProgress, setDeckProgress] = useState([])
  const [studyHistory, setStudyHistory] = useState([])
  const [studyActivity, setStudyActivity] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !authLoading) {
      fetchData()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading, timeFilter])

  // Listen for study progress updates
  useEffect(() => {
    const handleStudyProgressUpdate = () => {
      // Refresh dashboard data when study progress is updated
      if (user && !authLoading) {
        fetchData()
      }
    }

    window.addEventListener('studyProgressUpdated', handleStudyProgressUpdate)
    return () => {
      window.removeEventListener('studyProgressUpdated', handleStudyProgressUpdate)
    }
  }, [user, authLoading])

  const fetchData = async () => {
    try {
      const [setsRes, historyRes, activityRes] = await Promise.all([
        api.get('/api/flashcards/sets'),
        api.get('/api/study/sessions/history?days=' + (timeFilter === '7days' ? 7 : timeFilter === '30days' ? 30 : 365)).catch(() => ({ data: [] })),
        api.get('/api/study/activity?days=365').catch(() => ({ data: [] }))
      ])
      setSets(setsRes.data)
      setStudyHistory(historyRes.data || [])
      setStudyActivity(activityRes.data || [])
      
      // Fetch last studied dates for all sets
      const lastStudiedRes = await api.get('/api/study/sets/last-studied').catch(() => ({ data: {} }))
      const lastStudiedMap = lastStudiedRes.data || {}
      
      // Fetch progress for all sets
      const progressData = []
      let completedDecksCount = 0 // Count decks that are 100% complete
      
      // Count public decks (decks user owns OR public decks from others)
      // Since API already filters to return only accessible decks, we count all sets
      // But we need to exclude private decks from other users
      // Actually, API only returns: user's own decks (public or private) + public decks from others
      // So we can just count all sets in the response
      const publicDecksCount = setsRes.data.filter(set => {
        // Count if it's user's own deck OR it's public from another user
        return set.owner_id === user.id || set.is_public === true
      }).length

      for (const set of setsRes.data) {
        try {
          // Fetch progress and cards count in parallel
          const [progressRes, cardsRes] = await Promise.all([
            api.get(`/api/study/progress/${set.id}`).catch(() => null),
            api.get(`/api/flashcards/sets/${set.id}/cards`).catch(() => ({ data: [] }))
          ])
          
          // Get total cards from cards API (more accurate)
          const total_cards_from_api = cardsRes.data?.length || 0
          
          if (progressRes && progressRes.data) {
            const { total_cards, cards_mastered, cards_correct, cards_studied } = progressRes.data
            // Use total_cards from progress API if available, otherwise use cards API count
            const actual_total_cards = total_cards || total_cards_from_api
            const mastery = actual_total_cards > 0 ? Math.round((cards_mastered / actual_total_cards) * 100) : 0
            const accuracy = cards_studied > 0 ? Math.round((cards_correct / cards_studied) * 100) : 0

            // Check if deck is 100% complete (cards_studied === total_cards and total_cards > 0)
            if (actual_total_cards > 0 && cards_studied >= actual_total_cards) {
              completedDecksCount++
            }

            // Get last studied date from study sessions, fallback to null if not studied
            const lastStudiedDate = lastStudiedMap[set.id] || null

            progressData.push({
              id: set.id,
              name: set.title,
              mastery,
              accuracy,
              cards_studied: cards_studied || 0,
              total_cards: actual_total_cards,
              lastStudied: lastStudiedDate
            })
          } else {
            // No progress data, but we still have card count
            // Get last studied date from study sessions, fallback to null if not studied
            const lastStudiedDate = lastStudiedMap[set.id] || null
            
            progressData.push({
              id: set.id,
              name: set.title,
              mastery: 0,
              accuracy: 0,
              cards_studied: 0,
              total_cards: total_cards_from_api,
              lastStudied: lastStudiedDate
            })
          }
        } catch {
          // Error fetching, try to get at least card count
          try {
            const cardsRes = await api.get(`/api/flashcards/sets/${set.id}/cards`).catch(() => ({ data: [] }))
            const total_cards_from_api = cardsRes.data?.length || 0
            // Get last studied date from study sessions, fallback to null if not studied
            const lastStudiedDate = lastStudiedMap[set.id] || null
            
            progressData.push({
              id: set.id,
              name: set.title,
              mastery: 0,
              accuracy: 0,
              cards_studied: 0,
              total_cards: total_cards_from_api,
              lastStudied: lastStudiedDate
            })
          } catch {
            // Get last studied date from study sessions, fallback to null if not studied
            const lastStudiedDate = lastStudiedMap[set.id] || null
            
            progressData.push({
              id: set.id,
              name: set.title,
              mastery: 0,
              accuracy: 0,
              cards_studied: 0,
              total_cards: 0,
              lastStudied: lastStudiedDate
            })
          }
        }
      }

      setDeckProgress(progressData)
      
      // Get streak from leaderboard or calculate
      let streak = 0
      try {
        const rankRes = await api.get('/api/leaderboard/my-rank').catch(() => null)
        if (rankRes && rankRes.data) {
          streak = rankRes.data.streak_days || 0
        }
      } catch {}

      setStats({
        streak,
        totalMastered: completedDecksCount, // Now represents completed decks count
        accuracy: 0, // Not used anymore, but keep for compatibility
        dailyGoal: publicDecksCount, // Total number of public/accessible decks
        dailyProgress: completedDecksCount // Number of decks completed (100%)
      })

      if (setsRes.data.length > 0) {
        const progressRes = await api.get(`/api/study/progress/${setsRes.data[0].id}`).catch(() => null)
        if (progressRes) {
          setProgress(progressRes.data)
        }
      }
    } catch (error) {
      toast.error('Không thể tải dữ liệu trang chủ')
    } finally {
      setLoading(false)
    }
  }

  const formatLastStudied = (dateString) => {
    if (!dateString) return 'Chưa học'
    const date = new Date(dateString)
    const now = new Date()
    
    // Check if same day (same year, month, day)
    const isSameDay = date.getFullYear() === now.getFullYear() &&
                      date.getMonth() === now.getMonth() &&
                      date.getDate() === now.getDate()
    
    if (isSameDay) {
      // Same day - show relative time (minutes/hours ago)
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000) // milliseconds to minutes
      const diffHours = Math.floor(diffMs / 3600000) // milliseconds to hours
      
      if (diffMins < 1) return 'Vừa xong'
      if (diffMins < 60) return `${diffMins} phút trước`
      if (diffHours < 24) return `${diffHours} giờ trước`
      return 'Hôm nay'
    } else {
      // Different day - show date (dd/mm/yyyy)
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <TopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </main>
      </div>
    )
  }

  if (user && loading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <TopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <TopNav />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">
              Trang Chủ
            </p>
          </div>

          {/* Stats Cards */}
          {user && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-background-dark">
                <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-normal">
                  Chuỗi Ngày Học
                </p>
                <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
                  {stats.streak} Ngày
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-background-dark">
                <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-normal">
                  Tổng Bộ Thẻ Đã Thành Thạo
                </p>
                <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
                  {stats.totalMastered} Bộ Thẻ
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-background-dark">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-normal">
                    Mục Tiêu Hàng Ngày
                  </p>
                  <p className="text-gray-900 dark:text-white text-sm font-semibold">
                    {stats.dailyProgress} / {stats.dailyGoal}
                  </p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.dailyGoal > 0 && (stats.dailyProgress / stats.dailyGoal) >= 1
                        ? 'bg-green-500'
                        : stats.dailyGoal > 0 && (stats.dailyProgress / stats.dailyGoal) >= 0.5
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${stats.dailyGoal > 0 ? Math.min((stats.dailyProgress / stats.dailyGoal) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  {stats.dailyGoal > 0 && stats.dailyGoal - stats.dailyProgress > 0
                    ? `${stats.dailyGoal - stats.dailyProgress} bộ thẻ còn lại`
                    : stats.dailyGoal > 0 && stats.dailyProgress >= stats.dailyGoal
                    ? 'Đã đạt mục tiêu! 🎉'
                    : 'Chưa có bộ thẻ nào'}
                </p>
              </div>
            </div>
          )}

          {/* Study Performance */}
          {user && (
            <div className="flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-white/10 p-6 bg-white dark:bg-background-dark">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                  Hiệu Suất Học Tập
                </h2>
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/10 rounded-lg">
                  <button
                    onClick={() => setTimeFilter('7days')}
                    className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-md px-4 ${
                      timeFilter === '7days'
                        ? 'bg-white dark:bg-background-dark shadow-sm'
                        : ''
                    }`}
                  >
                    <p className={`text-sm font-medium leading-normal ${
                      timeFilter === '7days'
                        ? 'text-primary'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}>
                      7 Ngày Qua
                    </p>
                  </button>
                  <button
                    onClick={() => setTimeFilter('30days')}
                    className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-md px-4 ${
                      timeFilter === '30days'
                        ? 'bg-white dark:bg-background-dark shadow-sm'
                        : ''
                    }`}
                  >
                    <p className={`text-sm font-medium leading-normal ${
                      timeFilter === '30days'
                        ? 'text-primary'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}>
                      30 Ngày Qua
                    </p>
                  </button>
                  <button
                    onClick={() => setTimeFilter('alltime')}
                    className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-md px-4 ${
                      timeFilter === 'alltime'
                        ? 'bg-white dark:bg-background-dark shadow-sm'
                        : ''
                    }`}
                  >
                    <p className={`text-sm font-medium leading-normal ${
                      timeFilter === 'alltime'
                        ? 'text-primary'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}>
                      Tất Cả
                    </p>
                  </button>
                </div>
              </div>
              <div className="w-full h-80 bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                {studyHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studyHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value)
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="cards_studied" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Thẻ Đã Học"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cards_correct" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Thẻ Đúng"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                      No study data available yet
                </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deck Progress Table */}
          {user && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-white/10 p-6 bg-white dark:bg-background-dark">
              <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                Tiến Độ Bộ Thẻ
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Tên Thẻ
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Tiến Độ
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Lần Cuối Học
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deckProgress.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Chưa có bộ thẻ nào. Tạo bộ thẻ đầu tiên để bắt đầu!
                        </td>
                      </tr>
                    ) : (
                      deckProgress.map((deck, index) => (
                        <tr
                          key={deck.id}
                          className={index < deckProgress.length - 1 ? 'border-b border-gray-200 dark:border-white/10' : ''}
                        >
                          <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                            {deck.name}
                          </td>
                          <td className="p-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                            {deck.cards_studied || 0}/{deck.total_cards || 0} thẻ
                          </td>
                          <td className="p-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                            {formatLastStudied(deck.lastStudied)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!user && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Please login to view your dashboard
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
