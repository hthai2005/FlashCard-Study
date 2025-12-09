import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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
      
      // Fetch progress for all sets
      const progressData = []
      let totalMastered = 0
      let totalCards = 0
      let correctAnswers = 0
      let totalAnswers = 0
      let totalDailyProgress = 0
      let dailyGoal = 20

      for (const set of setsRes.data) {
        try {
          const progressRes = await api.get(`/api/study/progress/${set.id}`).catch(() => null)
          if (progressRes && progressRes.data) {
            const { total_cards, cards_mastered, cards_correct, cards_studied, daily_progress, daily_goal } = progressRes.data
            const mastery = total_cards > 0 ? Math.round((cards_mastered / total_cards) * 100) : 0
            const accuracy = cards_studied > 0 ? Math.round((cards_correct / cards_studied) * 100) : 0
            
            totalMastered += cards_mastered
            totalCards += total_cards
            correctAnswers += cards_correct || 0
            totalAnswers += cards_studied || 0
            totalDailyProgress += daily_progress || 0
            if (daily_goal) dailyGoal = daily_goal

            progressData.push({
              id: set.id,
              name: set.title,
              mastery,
              accuracy,
              lastStudied: set.updated_at || set.created_at
            })
          } else {
            progressData.push({
              id: set.id,
              name: set.title,
              mastery: 0,
              accuracy: 0,
              lastStudied: set.updated_at || set.created_at
            })
          }
        } catch {
          progressData.push({
            id: set.id,
            name: set.title,
            mastery: 0,
            accuracy: 0,
            lastStudied: set.updated_at || set.created_at
          })
        }
      }

      setDeckProgress(progressData)

      // Calculate overall stats
      const overallAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
      
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
        totalMastered,
        accuracy: overallAccuracy,
        dailyGoal,
        dailyProgress: totalDailyProgress
      })

      if (setsRes.data.length > 0) {
        const progressRes = await api.get(`/api/study/progress/${setsRes.data[0].id}`).catch(() => null)
        if (progressRes) {
          setProgress(progressRes.data)
        }
      }
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatLastStudied = (dateString) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
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
              Dashboard
            </p>
          </div>

          {/* Stats Cards */}
          {user && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-background-dark">
                <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-normal">
                  Current Study Streak
                </p>
                <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
                  {stats.streak} Days
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-background-dark">
                <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-normal">
                  Total Cards Mastered
                </p>
                <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
                  {stats.totalMastered} Cards
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-background-dark">
                <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-normal">
                  Overall Accuracy
                </p>
                <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
                  {stats.accuracy}%
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-background-dark">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-normal">
                    Daily Goal
                  </p>
                  <p className="text-gray-900 dark:text-white text-sm font-semibold">
                    {stats.dailyProgress} / {stats.dailyGoal}
                  </p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (stats.dailyProgress / stats.dailyGoal) >= 1
                        ? 'bg-green-500'
                        : (stats.dailyProgress / stats.dailyGoal) >= 0.5
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min((stats.dailyProgress / stats.dailyGoal) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  {stats.dailyGoal - stats.dailyProgress > 0
                    ? `${stats.dailyGoal - stats.dailyProgress} cards remaining`
                    : 'Goal achieved! 🎉'}
                </p>
              </div>
            </div>
          )}

          {/* Study Performance */}
          {user && (
            <div className="flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-white/10 p-6 bg-white dark:bg-background-dark">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                  Study Performance
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
                      Last 7 Days
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
                      Last 30 Days
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
                      All Time
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
                        name="Cards Studied"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cards_correct" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Cards Correct"
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

          {/* Study Activity & Mastery by Deck */}
          {user && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-white/10 p-6 bg-white dark:bg-background-dark">
                <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                  Study Activity
                </h2>
                <div className="w-full h-80 bg-gray-50 dark:bg-white/5 rounded-lg p-4 overflow-auto">
                  {studyActivity.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const bgColors = [
                            'bg-gray-100 dark:bg-gray-800',
                            'bg-green-200 dark:bg-green-900',
                            'bg-green-400 dark:bg-green-700',
                            'bg-green-600 dark:bg-green-600',
                            'bg-green-800 dark:bg-green-500'
                          ]
                          
                          return studyActivity.slice(-365).map((activity, index) => {
                            const date = new Date(activity.date)
                            const dayOfWeek = date.getDay()
                            const intensity = activity.intensity
                          
                          // Align first day of year to correct day of week
                          if (index === 0 && dayOfWeek !== 0) {
                            return (
                              <>
                                {Array.from({ length: dayOfWeek }).map((_, i) => (
                                  <div key={`empty-${i}`} className="aspect-square"></div>
                                ))}
                                <div
                                  key={activity.date}
                                  className={`aspect-square rounded ${bgColors[intensity]} cursor-pointer hover:ring-2 hover:ring-primary transition-all`}
                                  title={`${activity.date}: ${activity.cards_studied} cards`}
                                ></div>
                              </>
                            )
                          }
                          
                          return (
                            <div
                              key={activity.date}
                              className={`aspect-square rounded ${bgColors[intensity]} cursor-pointer hover:ring-2 hover:ring-primary transition-all`}
                              title={`${activity.date}: ${activity.cards_studied} cards`}
                            ></div>
                          )
                          })
                        })()}
                      </div>
                      <div className="flex items-center justify-end gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Less</span>
                        <div className="flex gap-1">
                          {[
                            'bg-gray-100 dark:bg-gray-800',
                            'bg-green-200 dark:bg-green-900',
                            'bg-green-400 dark:bg-green-700',
                            'bg-green-600 dark:bg-green-600',
                            'bg-green-800 dark:bg-green-500'
                          ].map((color, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded ${color}`}
                            ></div>
                          ))}
                        </div>
                        <span>More</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                        No activity data available yet
                  </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-white/10 p-6 bg-white dark:bg-background-dark">
                <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                  Mastery by Deck
                </h2>
                <div className="w-full h-80 bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  {deckProgress.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deckProgress.map(deck => ({
                            name: deck.name.length > 15 ? deck.name.substring(0, 15) + '...' : deck.name,
                            value: deck.mastery
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {deckProgress.map((entry, index) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                        No deck data available yet
                  </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Deck Progress Table */}
          {user && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-white/10 p-6 bg-white dark:bg-background-dark">
              <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                Deck Progress
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Deck Name
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Mastery
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Accuracy
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Last Studied
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deckProgress.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No decks yet. Create your first deck to get started!
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
                            {deck.mastery}%
                          </td>
                          <td className="p-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                            {deck.accuracy}%
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
