import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Leaderboard() {
  const { user, loading: authLoading } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [user])

  const fetchLeaderboard = async () => {
    try {
      const leaderboardRes = await api.get('/api/leaderboard/')
      setLeaderboard(leaderboardRes.data)
      
      // Only fetch my rank if user is logged in
      if (user) {
        try {
          const rankRes = await api.get('/api/leaderboard/my-rank')
          setMyRank(rankRes.data)
        } catch (error) {
          // Ignore error if not logged in
        }
      }
    } catch (error) {
      toast.error('Không thể tải bảng xếp hạng')
    } finally {
      setLoading(false)
    }
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
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <TopNav />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Bảng Xếp Hạng</h1>

          {/* My Rank Card */}
          {myRank && (
            <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl shadow-lg p-6 mb-8 text-white">
              <h2 className="text-xl font-semibold mb-4">Thống Kê Của Bạn</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm opacity-90">Hạng</div>
                  <div className="text-2xl font-bold">#{myRank.rank || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm opacity-90">Điểm</div>
                  <div className="text-2xl font-bold">{myRank.points}</div>
                </div>
                <div>
                  <div className="text-sm opacity-90">Thời Gian Học</div>
                  <div className="text-2xl font-bold">{myRank.total_study_time}m</div>
                </div>
                <div>
                  <div className="text-sm opacity-90">Thẻ Đã Học</div>
                  <div className="text-2xl font-bold">{myRank.total_cards_studied}</div>
                </div>
                <div>
                  <div className="text-sm opacity-90">Chuỗi Ngày</div>
                  <div className="text-2xl font-bold">🔥 {myRank.streak_days}</div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700/80">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Hạng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tên Đăng Nhập
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Điểm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Thời Gian Học
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Thẻ Đã Học
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Chuỗi Ngày
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                {leaderboard.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-primary">#{index + 1}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{entry.points}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{entry.total_study_time} phút</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{entry.total_cards_studied}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">🔥 {entry.streak_days} ngày</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
