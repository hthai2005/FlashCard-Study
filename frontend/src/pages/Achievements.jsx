import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Achievements() {
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    currentStreak: 0,
    totalDecks: 0,
    perfectQuizzes: 0,
    correctStreak: 0
  })

  useEffect(() => {
    if (user && !authLoading) {
      fetchAchievements()
    } else if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading])

  const fetchAchievements = async () => {
    try {
      // Fetch user stats
      const [setsRes, rankRes] = await Promise.all([
        api.get('/api/flashcards/sets').catch(() => ({ data: [] })),
        api.get('/api/leaderboard/my-rank').catch(() => ({ data: null }))
      ])

      const currentStreak = rankRes.data?.streak_days || 0
      
      // Filter only user's own decks (owner_id === user.id)
      const userOwnDecks = setsRes.data.filter(set => set.owner_id === user.id)
      const totalDecksCreated = userOwnDecks.length

      // Check for 100% completed decks (Bước Đầu and Vua Kiến Thức)
      let completedDecksCount = 0
      let hasOneCompletedDeck = false
      
      // Check for quick learner (master a deck within 1 hour)
      let quickLearnerCompleted = false
      
      for (const set of userOwnDecks) {
        try {
          const progressRes = await api.get(`/api/study/progress/${set.id}`).catch(() => null)
          if (progressRes && progressRes.data) {
            const { total_cards, cards_studied } = progressRes.data
            if (total_cards > 0 && cards_studied >= total_cards) {
              completedDecksCount++
              if (!hasOneCompletedDeck) {
                hasOneCompletedDeck = true
              }
              
              // Check for quick learner: master a deck within 1 hour
              // We need to check study sessions for this deck
              try {
                const sessionsRes = await api.get(`/api/study/sessions?set_id=${set.id}`).catch(() => ({ data: [] }))
                if (sessionsRes.data && sessionsRes.data.length > 0) {
                  // Sort sessions by start time
                  const sessions = sessionsRes.data.sort((a, b) => 
                    new Date(a.started_at) - new Date(b.started_at)
                  )
                  
                  const firstSession = sessions[0]
                  if (!firstSession || !firstSession.completed_at) continue
                  
                  // Find the session where we first reached 100% completion
                  // We'll check each session and see when cumulative cards studied >= total_cards
                  let cumulativeCardsStudied = 0
                  let completionSession = null
                  
                  for (const session of sessions) {
                    if (!session.completed_at) continue
                    cumulativeCardsStudied += session.cards_studied || 0
                    
                    // Check if we've reached 100% completion
                    if (cumulativeCardsStudied >= total_cards) {
                      completionSession = session
                      break
                    }
                  }
                  
                  // If we found when we completed it, check if it was within 1 hour from first session
                  if (completionSession && completionSession.completed_at) {
                    const startTime = new Date(firstSession.started_at)
                    const endTime = new Date(completionSession.completed_at)
                    const hoursDiff = (endTime - startTime) / (1000 * 60 * 60)
                    
                    if (hoursDiff <= 1 && hoursDiff >= 0) {
                      quickLearnerCompleted = true
                    }
                  }
                }
              } catch (err) {
                console.error('Error checking quick learner:', err)
              }
            }
          }
        } catch {}
      }

      // Calculate correct streak (Người Hoàn Hảo)
      let correctStreak = 0
      try {
        const streakRes = await api.get('/api/study/correct-streak').catch(() => ({ data: { current_streak: 0 } }))
        correctStreak = streakRes.data?.current_streak || 0
      } catch {}

      // Calculate achievements
      const achievementList = [
        {
          id: 'first_steps',
          icon: 'school',
          title: 'Bước Đầu',
          description: 'Hoàn thành 100% một bộ thẻ.',
          progress: hasOneCompletedDeck ? 1 : 0,
          maxProgress: 1,
          completed: hasOneCompletedDeck,
          status: hasOneCompletedDeck ? '1/1 Đã Hoàn Thành' : '0/1 Đã Hoàn Thành'
        },
        {
          id: 'study_streak',
          icon: 'local_fire_department',
          title: 'Chuỗi Học Tập',
          description: 'Duy trì chuỗi học tập 7 ngày liên tiếp.',
          progress: Math.min(currentStreak, 7),
          maxProgress: 7,
          completed: currentStreak >= 7,
          status: `${currentStreak}/7 Ngày`
        },
        {
          id: 'deck_builder',
          icon: 'library_add',
          title: 'Người Xây Dựng',
          description: 'Tạo 5 bộ thẻ tùy chỉnh.',
          progress: Math.min(totalDecksCreated, 5),
          maxProgress: 5,
          completed: totalDecksCreated >= 5,
          status: `${totalDecksCreated}/5 Bộ Thẻ`
        },
        {
          id: 'quick_learner',
          icon: 'rocket_launch',
          title: 'Học Nhanh',
          description: 'Thành thạo một bộ thẻ trong vòng một giờ.',
          progress: quickLearnerCompleted ? 1 : 0,
          maxProgress: 1,
          completed: quickLearnerCompleted,
          status: quickLearnerCompleted ? '1/1 Đã Hoàn Thành' : 'Đã Khóa'
        },
        {
          id: 'knowledge_king',
          icon: 'social_leaderboard',
          title: 'Vua Kiến Thức',
          description: 'Hoàn thành 100% 10 bộ thẻ của bạn.',
          progress: Math.min(completedDecksCount, 10),
          maxProgress: 10,
          completed: completedDecksCount >= 10,
          status: `${completedDecksCount}/10 Bộ Thẻ`
        },
        {
          id: 'perfectionist',
          icon: 'workspace_premium',
          title: 'Người Hoàn Hảo',
          description: 'Trả lời đúng 1000 thẻ liên tiếp.',
          progress: Math.min(correctStreak, 1000),
          maxProgress: 1000,
          completed: correctStreak >= 1000,
          status: `${correctStreak}/1000 Thẻ`
        }
      ]

      setAchievements(achievementList)
      setStats({
        totalSessions: 0,
        currentStreak,
        totalDecks: totalDecksCreated,
        perfectQuizzes: completedDecksCount,
        correctStreak
      })
    } catch (error) {
      console.error('Error fetching achievements:', error)
      toast.error('Không thể tải thành tựu')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <TopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden">
      <TopNav />
      
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-24 flex flex-col gap-2 bg-white dark:bg-[#1c2327] p-4 rounded-xl border border-slate-200 dark:border-[#283339]">
              <a
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/profile')
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#283339] text-slate-700 dark:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">person</span>
                <p className="text-sm font-medium leading-normal">Hồ Sơ</p>
              </a>
              <a
                onClick={(e) => {
                  e.preventDefault()
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/20 text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">military_tech</span>
                <p className="text-sm font-medium leading-normal">Thành Tựu</p>
              </a>
              <div className="border-t border-slate-200 dark:border-[#283339] my-2"></div>
              <a
                onClick={(e) => {
                  e.preventDefault()
                  toast.info('Trung tâm trợ giúp sẽ sớm có mặt!')
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#283339] text-slate-700 dark:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">help</span>
                <p className="text-sm font-medium leading-normal">Trợ Giúp</p>
              </a>
              <a
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">logout</span>
                <p className="text-sm font-medium leading-normal">Đăng Xuất</p>
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6" id="achievements">
                <h1 className="text-slate-900 dark:text-white text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">
                  Thành Tựu
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {achievements.map((achievement) => {
                    const progressPercentage = achievement.maxProgress > 0
                      ? (achievement.progress / achievement.maxProgress) * 100
                      : 0
                    const isLocked = !achievement.completed && achievement.progress === 0 && achievement.id !== 'first_steps'

                    return (
                      <div
                        key={achievement.id}
                        className={`flex flex-col items-center gap-4 bg-white dark:bg-[#1c2327] p-6 rounded-xl border border-slate-200 dark:border-[#283339] ${
                          isLocked ? 'opacity-50' : ''
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center size-20 rounded-full ${
                            achievement.completed
                              ? 'bg-primary/10 text-primary'
                              : isLocked
                              ? 'bg-slate-200 dark:bg-[#283339] text-slate-500 dark:text-[#9db0b9]'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-5xl">{achievement.icon}</span>
                        </div>
                        <div className="text-center">
                          <h3
                            className={`text-lg font-bold ${
                              achievement.completed
                                ? 'text-slate-900 dark:text-white'
                                : isLocked
                                ? 'text-slate-700 dark:text-white/80'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {achievement.title}
                          </h3>
                          <p className="text-slate-500 dark:text-[#9db0b9] text-sm">
                            {achievement.description}
                          </p>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-[#283339] rounded-full h-2.5">
                          <div
                            className="bg-primary h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                        <p className="text-slate-500 dark:text-[#9db0b9] text-xs font-medium">
                          {achievement.status}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

