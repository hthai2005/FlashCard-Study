import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import AdminSidebar from '../components/AdminSidebar'
import AdminHeader from '../components/AdminHeader'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSets: 0,
    activeSessions: 0,
    reportedItems: 0,
    reportsTotal: 0,
    reports24h: 0,
    reports7d: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [recentActivities, setRecentActivities] = useState([])
  const [userGrowthData, setUserGrowthData] = useState([])
  const [userGrowthFilter, setUserGrowthFilter] = useState('30') // '7', '30', 'all'
  const [cardsStats, setCardsStats] = useState({
    total_cards: 0,
    cards_today: 0,
    cards_this_week: 0,
    cards_this_month: 0,
    avg_cards_per_deck: 0,
    total_decks: 0
  })

  useEffect(() => {
    if (user && !authLoading) {
      fetchStats()
    } else if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, userGrowthFilter])

  const fetchStats = async () => {
    try {
      // Fetch stats from API
      const [usersRes, setsRes, reportsStatsRes, activitiesRes, userGrowthRes, cardsStatsRes] = await Promise.all([
        api.get('/api/admin/users').catch(() => ({ data: { total: 0, users: [] } })),
        api.get('/api/admin/sets').catch(() => ({ data: [] })),
        api.get('/api/reports/admin/stats/summary').catch(() => ({ data: { pending: 0, total: 0, last_24h: 0, last_7d: 0 } })),
        api.get('/api/admin/activities').catch(() => ({ data: [] })),
        api.get(`/api/admin/stats/user-growth?days=${userGrowthFilter === 'all' ? '365' : userGrowthFilter}`).catch(() => ({ data: [] })),
        api.get('/api/admin/stats/cards-created').catch(() => ({ data: { total_cards: 0, cards_today: 0, cards_this_week: 0, cards_this_month: 0, avg_cards_per_deck: 0, total_decks: 0 } }))
      ])

      setStats({
        totalUsers: usersRes.data.total || usersRes.data.users?.length || 0,
        totalSets: setsRes.data.length || 0,
        activeSessions: 0, // Can be fetched from sessions API
        reportedItems: reportsStatsRes.data.pending || 0,
        reportsTotal: reportsStatsRes.data.total || 0,
        reports24h: reportsStatsRes.data.last_24h || 0,
        reports7d: reportsStatsRes.data.last_7d || 0
      })
      
      setRecentActivities(activitiesRes.data || [])
      setUserGrowthData(userGrowthRes.data || [])
      setCardsStats(cardsStatsRes.data || {
        total_cards: 0,
        cards_today: 0,
        cards_this_week: 0,
        cards_this_month: 0,
        avg_cards_per_deck: 0,
        total_decks: 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Use default values if API fails
      setStats({
        totalUsers: 0,
        totalSets: 0,
        activeSessions: 0,
        reportedItems: 0,
        reportsTotal: 0,
        reports24h: 0,
        reports7d: 0
      })
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

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      <AdminHeader pageTitle="Trang Chủ" />

      <div className="flex h-[calc(100vh-4rem)] grow">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
              <p className="text-base font-medium text-gray-600 dark:text-gray-300">Tổng Người Dùng</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalUsers.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-[#2ECC71]">+2.5% so với tháng trước</p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
              <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                Tổng Bộ Thẻ
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalSets.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-[#E74C3C]">-0.2% so với tháng trước</p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
              <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                Phiên Học Đang Hoạt Động
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activeSessions.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-[#2ECC71]">+15% so với hôm qua</p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
              <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                Báo Cáo Chờ Xử Lý
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.reportedItems}
              </p>
              <p className="text-sm font-medium text-[#E74C3C]">
                {stats.reports24h > 0 ? `+${stats.reports24h} trong 24h` : 'Không có báo cáo mới'}
              </p>
            </div>
          </div>

          {/* Report Statistics */}
          {stats.reportsTotal > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
                <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                  Tổng Báo Cáo
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.reportsTotal.toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
                <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                  Báo Cáo 24h Qua
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.reports24h.toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
                <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                  Báo Cáo 7 Ngày Qua
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.reports7d.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A2831] p-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Tăng Trưởng Người Dùng
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {userGrowthFilter === '7' ? '7 Ngày Qua' : userGrowthFilter === '30' ? '30 Ngày Qua' : 'Tất Cả'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserGrowthFilter('7')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userGrowthFilter === '7'
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    7 Ngày
                  </button>
                  <button
                    onClick={() => setUserGrowthFilter('30')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userGrowthFilter === '30'
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    30 Ngày
                  </button>
                  <button
                    onClick={() => setUserGrowthFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userGrowthFilter === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Tất Cả
                  </button>
                </div>
              </div>
              <div className="h-72 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                {userGrowthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          if (userGrowthFilter === 'all') {
                            // For "all", show month/year
                            return `${date.getMonth() + 1}/${date.getFullYear()}`
                          } else {
                            // For 7/30 days, show day/month
                            return `${date.getDate()}/${date.getMonth() + 1}`
                          }
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
                          return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="new_users" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Người Dùng Mới"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone"
                        dataKey="total_users" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Tổng Người Dùng"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      Chưa có dữ liệu
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A2831] p-6">
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Thống Kê Thẻ Được Tạo
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng Quan</p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tổng Số Thẻ</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {cardsStats.total_cards.toLocaleString()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Hôm Nay</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {cardsStats.cards_today}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tuần Này</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {cardsStats.cards_this_week}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tháng Này</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {cardsStats.cards_this_month}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-600 dark:text-gray-400">TB/Deck</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {cardsStats.avg_cards_per_deck}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="md:col-span-1 flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A2831] p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/admin/users')}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined text-base">group</span>
                  Quản Lý Người Dùng
                </button>
                <button
                  onClick={() => navigate('/admin/sets')}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <span className="material-symbols-outlined text-base">style</span>
                  Xem Tất Cả Bộ Thẻ
                </button>
                <button
                  onClick={() => navigate('/admin/moderation')}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <span className="material-symbols-outlined text-base">gavel</span>
                  Hàng Đợi Kiểm Duyệt
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="md:col-span-2 flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A2831] p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Hoạt Động Gần Đây
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentActivities.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Chưa có hoạt động nào
                        </td>
                      </tr>
                    ) : (
                      recentActivities.map((activity, index) => {
                        const getIcon = () => {
                          if (activity.type === 'deck_created') {
                            return <span className="material-symbols-outlined text-blue-500">style</span>
                          } else if (activity.type === 'study_session') {
                            return <span className="material-symbols-outlined text-green-500">school</span>
                          } else if (activity.type === 'report') {
                            return <span className="material-symbols-outlined text-red-500">flag</span>
                          }
                          return <div className="bg-gradient-to-br from-primary-400 to-purple-500 aspect-square rounded-full size-8 flex items-center justify-center text-white text-xs font-semibold">
                            {activity.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                        }
                        
                        const getTimeAgo = (timestamp) => {
                          if (!timestamp) return 'Không xác định'
                          const now = new Date()
                          const time = new Date(timestamp)
                          const diffMs = now - time
                          const diffMins = Math.floor(diffMs / 60000)
                          const diffHours = Math.floor(diffMs / 3600000)
                          const diffDays = Math.floor(diffMs / 86400000)
                          
                          if (diffMins < 1) return 'Vừa xong'
                          if (diffMins < 60) return `${diffMins} phút trước`
                          if (diffHours < 24) return `${diffHours} giờ trước`
                          return `${diffDays} ngày trước`
                        }
                        
                        return (
                          <tr key={index}>
                            <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-3">
                                {getIcon()}
                                <p>
                                  <span className="font-medium text-gray-800 dark:text-gray-200">{activity.username}</span>{' '}
                                  {activity.description}
                                </p>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-2 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                              {getTimeAgo(activity.timestamp)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}

