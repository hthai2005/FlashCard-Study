import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSets: 0,
    activeSessions: 0,
    reportedItems: 0
  })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user && !authLoading) {
      fetchStats()
    } else if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading])

  const fetchStats = async () => {
    try {
      // Fetch stats from API (these endpoints may need to be created)
      const [usersRes, setsRes] = await Promise.all([
        api.get('/api/admin/users').catch(() => ({ data: { count: 0 } })),
        api.get('/api/flashcards/sets').catch(() => ({ data: [] }))
      ])

      setStats({
        totalUsers: usersRes.data.count || usersRes.data.length || 0,
        totalSets: setsRes.data.length || 0,
        activeSessions: 0, // Can be fetched from sessions API
        reportedItems: 0 // Can be fetched from reports API
      })
    } catch (error) {
      // Use mock data if API fails
      setStats({
        totalUsers: 12456,
        totalSets: 8321,
        activeSessions: 582,
        reportedItems: 12
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
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* TopNavBar */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A2831] px-6 py-4 sticky top-0 z-10">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</p>
          <div className="flex items-center gap-4">
            <label className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                search
              </span>
              <input
                className="form-input w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 pl-10 focus:ring-primary focus:border-primary"
                placeholder="Search for users, sets..."
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <button className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary-400 to-purple-500 aspect-square rounded-full size-10 flex items-center justify-center text-white font-semibold text-sm">
                {user.username?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-col hidden md:flex">
                <h2 className="text-sm font-medium text-gray-800 dark:text-white">
                  {user.username || 'Admin Name'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
              <p className="text-base font-medium text-gray-600 dark:text-gray-300">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalUsers.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-[#2ECC71]">+2.5% vs last month</p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
              <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                Total Flashcard Sets
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalSets.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-[#E74C3C]">-0.2% vs last month</p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
              <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                Active Study Sessions
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activeSessions.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-[#2ECC71]">+15% vs yesterday</p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1A2831] border border-gray-200 dark:border-gray-700">
              <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                Reported Items
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.reportedItems}
              </p>
              <p className="text-sm font-medium text-[#2ECC71]">-1% vs last week</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A2831] p-6">
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  New User Growth
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 Days</p>
              </div>
              <div className="h-72 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Chart visualization coming soon
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A2831] p-6">
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Top Flashcard Categories
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">All Time</p>
              </div>
              <div className="grid grid-rows-5 gap-4 pt-2">
                <div className="flex items-center gap-4">
                  <p className="w-16 text-sm text-gray-500 dark:text-gray-400">Science</p>
                  <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-2 rounded-full bg-primary" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="w-16 text-sm text-gray-500 dark:text-gray-400">Math</p>
                  <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-2 rounded-full bg-primary" style={{ width: '50%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="w-16 text-sm text-gray-500 dark:text-gray-400">History</p>
                  <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-2 rounded-full bg-primary" style={{ width: '30%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="w-16 text-sm text-gray-500 dark:text-gray-400">Art</p>
                  <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-2 rounded-full bg-primary" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="w-16 text-sm text-gray-500 dark:text-gray-400">Language</p>
                  <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-2 rounded-full bg-primary" style={{ width: '20%' }}></div>
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
                  Manage Users
                </button>
                <button
                  onClick={() => navigate('/admin/sets')}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <span className="material-symbols-outlined text-base">style</span>
                  View All Sets
                </button>
                <button
                  onClick={() => navigate('/admin/moderation')}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <span className="material-symbols-outlined text-base">gavel</span>
                  Moderation Queue
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="md:col-span-2 flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A2831] p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-primary-400 to-purple-500 aspect-square rounded-full size-8 flex items-center justify-center text-white text-xs font-semibold">
                            J
                          </div>
                          <p>
                            User <span className="font-medium text-gray-800 dark:text-gray-200">john.doe</span>{' '}
                            registered.
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                        2 min ago
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-red-500">flag</span>
                          <p>
                            Set <span className="font-medium text-gray-800 dark:text-gray-200">'Biology 101'</span>{' '}
                            was reported.
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                        1 hour ago
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-primary-400 to-purple-500 aspect-square rounded-full size-8 flex items-center justify-center text-white text-xs font-semibold">
                            J
                          </div>
                          <p>
                            User <span className="font-medium text-gray-800 dark:text-gray-200">jane.smith</span>{' '}
                            registered.
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                        3 hours ago
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-green-500">add_circle</span>
                          <p>
                            New set <span className="font-medium text-gray-800 dark:text-gray-200">'World Capitals'</span>{' '}
                            was created.
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                        5 hours ago
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

