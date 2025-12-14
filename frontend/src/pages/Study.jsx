import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Study() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [stats, setStats] = useState({ studied: 0, correct: 0, incorrect: 0 })
  const [startTime] = useState(Date.now())
  const [setInfo, setSetInfo] = useState(null)
  const [nextReview, setNextReview] = useState(null)
  const [totalCards, setTotalCards] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answerFeedback, setAnswerFeedback] = useState(null) // 'correct', 'incorrect', or null
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [showStudyModeModal, setShowStudyModeModal] = useState(false)
  const [hasProgress, setHasProgress] = useState(false)
  const [studyProgress, setStudyProgress] = useState(null)
  const [restartFromBeginning, setRestartFromBeginning] = useState(false)
  const [initialCardsStudied, setInitialCardsStudied] = useState(0) // Số thẻ đã học trước đó

  useEffect(() => {
    checkProgressAndShowModal()
  }, [setId])

  const checkProgressAndShowModal = async () => {
    try {
      // Fetch set info first
      const setInfoRes = await api.get(`/api/flashcards/sets/${setId}`)
      setSetInfo(setInfoRes.data)
      
      // Get total cards count
      const cardsRes = await api.get(`/api/flashcards/sets/${setId}/cards`)
      setTotalCards(cardsRes.data.length)
      
      // Check progress
      const progressRes = await api.get(`/api/study/progress/${setId}`).catch(() => null)
      if (progressRes && progressRes.data) {
        const progress = progressRes.data
        // If user has studied at least one card, show modal
        if (progress.cards_studied > 0) {
          setHasProgress(true)
          setStudyProgress(progress)
          setShowStudyModeModal(true)
          return // Don't fetch cards yet, wait for user choice
        }
      }
      
      // No progress, start normally
      startSession()
      fetchCards(false) // false = don't restart from beginning
    } catch (error) {
      console.error('Error checking progress:', error)
      toast.error('Không thể tải thông tin bộ thẻ')
    }
  }

  const handleContinueStudy = () => {
    setShowStudyModeModal(false)
    setRestartFromBeginning(false)
    // Set initial cards studied from previous progress
    if (studyProgress) {
      setInitialCardsStudied(studyProgress.cards_studied || 0)
    }
    startSession()
    fetchCards(false) // Continue from where left off
  }

  const handleRestartFromBeginning = async () => {
    setShowStudyModeModal(false)
    setRestartFromBeginning(true)
    // Reset initial cards studied to 0 when restarting
    setInitialCardsStudied(0)
    
    // Reset study progress on backend
    try {
      await api.post(`/api/study/sets/${setId}/reset`)
      toast.success('Đã reset tiến độ học tập')
    } catch (error) {
      console.error('Error resetting progress:', error)
      toast.error('Không thể reset tiến độ học tập')
    }
    
    startSession()
    fetchCards(true) // true = restart from beginning
  }

  // Reset state when card changes
  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      setUserAnswer('')
      setAnswerFeedback(null)
      setWrongAttempts(0)
      setShowAnswer(false)
    }
  }, [currentIndex, cards.length])

  const startSession = async () => {
    try {
      const response = await api.post('/api/study/sessions', { set_id: parseInt(setId) })
      setSessionId(response.data.id)
    } catch (error) {
      toast.error('Không thể bắt đầu phiên học')
    }
  }

  const fetchCards = async (restartFromBeginning = false) => {
    try {
      if (restartFromBeginning) {
        // Get all cards from the set (restart from beginning)
        const allCardsRes = await api.get(`/api/flashcards/sets/${setId}/cards`)
        if (allCardsRes.data && allCardsRes.data.length > 0) {
          // Convert to FlashcardWithProgress format
          const cardsWithProgress = allCardsRes.data.map(card => ({
            id: card.id,
            set_id: card.set_id,
            front: card.front,
            back: card.back,
            created_at: card.created_at,
            ease_factor: 2.5,
            interval: 1,
            next_review_date: null,
            total_reviews: 0,
            correct_count: 0,
            incorrect_count: 0
          }))
          setCards(cardsWithProgress)
          // Update totalCards
          setTotalCards(allCardsRes.data.length)
        } else {
          setCards([])
        }
      } else {
        // Get cards due (continue from where left off)
        const response = await api.get(`/api/study/sets/${setId}/due`)
        if (response.data && response.data.length > 0) {
          setCards(response.data)
          // Update totalCards if not already set
          if (totalCards === 0) {
            setTotalCards(response.data.length)
          }
        } else {
          // If no cards due, try to get all cards from the set
          try {
            const allCardsRes = await api.get(`/api/flashcards/sets/${setId}/cards`)
            if (allCardsRes.data && allCardsRes.data.length > 0) {
              // Convert to FlashcardWithProgress format
              const cardsWithProgress = allCardsRes.data.map(card => ({
                id: card.id,
                set_id: card.set_id,
                front: card.front,
                back: card.back,
                created_at: card.created_at,
                ease_factor: 2.5,
                interval: 1,
                next_review_date: null,
                total_reviews: 0,
                correct_count: 0,
                incorrect_count: 0
              }))
              setCards(cardsWithProgress)
              // Update totalCards
              setTotalCards(allCardsRes.data.length)
            } else {
              setCards([])
            }
          } catch (err) {
            console.error('Error fetching all cards:', err)
            setCards([])
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cards:', error)
      toast.error('Không thể tải flashcard')
      setCards([])
    }
  }

  const checkAnswer = () => {
    const currentCard = cards[currentIndex]
    if (!currentCard || !userAnswer.trim()) return

    // Normalize answers for comparison (lowercase, trim, remove extra spaces)
    const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, ' ')
    const normalizedCorrectAnswer = currentCard.back.trim().toLowerCase().replace(/\s+/g, ' ')

    // Check if answer is correct (exact match or contains the correct answer)
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer || 
                     normalizedCorrectAnswer.includes(normalizedUserAnswer) ||
                     normalizedUserAnswer.includes(normalizedCorrectAnswer)

    if (isCorrect) {
      setAnswerFeedback('correct')
      // Auto submit with quality 4 (good answer)
      setTimeout(() => {
        handleAnswer(4)
      }, 1000)
    } else {
      setAnswerFeedback('incorrect')
      setWrongAttempts(prev => prev + 1)
      // Clear input for retry
      setUserAnswer('')
    }
  }

  const handleAnswer = async (quality) => {
    const currentCard = cards[currentIndex]
    if (!currentCard) return

    try {
      await api.post('/api/study/answer', {
        flashcard_id: currentCard.id,
        quality: quality
      })

      // Refresh progress to get updated data
      const progressRes = await api.get(`/api/study/progress/${setId}`).catch(() => null)
      if (progressRes && currentCard.next_review_date) {
        const days = Math.ceil((new Date(currentCard.next_review_date) - new Date()) / (1000 * 60 * 60 * 24))
        setNextReview(days > 0 ? days : 0)
      }

      const newStats = { ...stats }
      newStats.studied += 1
      if (quality >= 3) {
        newStats.correct += 1
      } else {
        newStats.incorrect += 1
      }
      setStats(newStats)
      
      // Trigger a custom event to notify other pages to refresh
      window.dispatchEvent(new CustomEvent('studyProgressUpdated', { 
        detail: { set_id: parseInt(setId) } 
      }))

      // Move to next card after a short delay
      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(currentIndex + 1)
          setShowAnswer(false)
          setNextReview(null)
          setUserAnswer('')
          setAnswerFeedback(null)
          setWrongAttempts(0)
        } else {
          completeSession(newStats)
        }
      }, 1500)
    } catch (error) {
      toast.error('Failed to submit answer')
    }
  }

  const handleShowAnswer = () => {
    setShowAnswer(true)
    setAnswerFeedback(null)
  }

  // Reset state when card changes
  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      setUserAnswer('')
      setAnswerFeedback(null)
      setWrongAttempts(0)
      setShowAnswer(false)
    }
  }, [currentIndex, cards.length])

  const completeSession = async (finalStats) => {
    const duration = Math.floor((Date.now() - startTime) / 1000 / 60)
    
    try {
      if (sessionId) {
        await api.put(`/api/study/sessions/${sessionId}`, {
          cards_studied: finalStats.studied,
          cards_correct: finalStats.correct,
          cards_incorrect: finalStats.incorrect,
          duration_minutes: duration
        })
      }
      
      const totalCardsCount = totalCards > 0 ? totalCards : cards.length
      const totalStudiedInSession = initialCardsStudied + finalStats.studied
      const percentage = totalCardsCount > 0 ? Math.round((totalStudiedInSession / totalCardsCount) * 100) : 0
      
      toast.success(`Hoàn thành phiên học! Bạn đã học ${totalStudiedInSession}/${totalCardsCount} thẻ.`)
      
      // Add notification
      addNotification({
        type: 'success',
        title: 'Hoàn thành phiên học',
        message: `Bạn đã học ${totalStudiedInSession}/${totalCardsCount} thẻ (${percentage}%) trong bộ "${setInfo?.title || 'Bộ thẻ'}"`,
        action: { type: 'navigate', path: `/sets/${setId}` }
      })
      
      // Trigger event to refresh other pages
      window.dispatchEvent(new CustomEvent('studyProgressUpdated', { 
        detail: { set_id: parseInt(setId) } 
      }))
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Error completing session:', error)
      toast.error('Không thể hoàn thành phiên học')
      // Still navigate even if API call fails
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
    }
  }

  const handleEndSession = async () => {
    let progressMessage = 'Bạn có chắc muốn kết thúc phiên học này?'
    
    // Use totalCards if available, otherwise use cards.length
    const totalCardsCount = totalCards > 0 ? totalCards : cards.length
    const totalStudied = initialCardsStudied + stats.studied
    
    if (totalStudied > 0 && totalCardsCount > 0) {
      const percentage = Math.round((totalStudied / totalCardsCount) * 100)
      progressMessage = `Bạn đã học ${totalStudied}/${totalCardsCount} thẻ (${percentage}%). Bạn có muốn kết thúc phiên học này?`
    }
    
    if (window.confirm(progressMessage)) {
      if (sessionId) {
        await completeSession(stats)
      } else {
        navigate('/dashboard')
      }
    }
  }

  // Show modal if there's progress and user hasn't chosen yet
  if (showStudyModeModal && hasProgress && studyProgress) {
    const progressPercentage = studyProgress.total_cards > 0 
      ? Math.round((studyProgress.cards_studied / studyProgress.total_cards) * 100) 
      : 0
    
    return (
      <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <TopNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#1c2327] rounded-xl p-8 max-w-md w-full mx-4 border border-slate-200 dark:border-[#283339]">
              <div className="flex flex-col gap-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Bạn đã học dở bộ thẻ này
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Bạn đã học {studyProgress.cards_studied}/{studyProgress.total_cards} thẻ ({progressPercentage}%)
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleContinueStudy}
                    className="flex items-center justify-center gap-3 rounded-lg h-14 px-6 bg-primary text-white text-base font-bold transition-colors hover:bg-primary/90"
                  >
                    <span className="material-symbols-outlined">play_arrow</span>
                    <span>Tiếp Tục Học</span>
                  </button>
                  
                  <button
                    onClick={handleRestartFromBeginning}
                    className="flex items-center justify-center gap-3 rounded-lg h-14 px-6 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    <span>Học Lại Từ Đầu</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (cards.length === 0 && !showStudyModeModal) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <TopNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Không có thẻ nào để ôn tập!</p>
            <button
              onClick={() => navigate('/sets')}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg"
            >
              Quay Lại Danh Sách
            </button>
          </div>
        </main>
      </div>
    )
  }

  const currentCard = cards[currentIndex]
  // Use totalCards if available, otherwise use cards.length for progress calculation
  const totalCardsCount = totalCards > 0 ? totalCards : cards.length
  // Calculate total cards studied (previous + current session)
  const totalStudied = initialCardsStudied + stats.studied
  const progressPercentage = totalCardsCount > 0 ? (totalStudied / totalCardsCount) * 100 : 0

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <TopNav />
      
      {/* Header Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-700/50 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-gray-800 dark:text-white">
                <span className="material-symbols-outlined text-2xl">layers</span>
                <h1 className="text-lg font-bold leading-tight">
                  {setInfo?.title || 'Loading...'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleEndSession}
                className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal transition-colors hover:bg-primary/90"
              >
                <span>Kết Thúc Phiên</span>
              </button>
            </div>
          </header>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
          {/* Progress */}
          <div className="px-4">
            <div className="flex flex-col gap-2">
              <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Tiến Độ</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                {totalStudied}/{totalCardsCount} thẻ đã ôn tập
              </p>
            </div>
          </div>

          {/* Flashcard */}
          <div className="p-4">
            <div className="flex flex-col items-center justify-center rounded-xl shadow-lg bg-white dark:bg-[#1c1f27] min-h-[320px] p-8 text-center">
              <div className="flex flex-col gap-4 items-center justify-center w-full">
                {/* Front of card */}
                <p className="text-gray-800 dark:text-white text-2xl font-bold tracking-tight">
                  {currentCard?.front || 'Loading...'}
                </p>

                {!showAnswer ? (
                  <>
                    {/* Answer Input */}
                    <div className="w-full max-w-md flex flex-col gap-3">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && userAnswer.trim()) {
                            checkAnswer()
                          }
                        }}
                        placeholder="Nhập câu trả lời của bạn..."
                        className={`w-full px-4 py-3 rounded-lg border-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          answerFeedback === 'correct'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : answerFeedback === 'incorrect'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        disabled={answerFeedback === 'correct'}
                      />
                      
                      {/* Feedback */}
                      {answerFeedback === 'correct' && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <span className="material-symbols-outlined">check_circle</span>
                          <span className="font-medium">Đúng!</span>
                        </div>
                      )}
                      {answerFeedback === 'incorrect' && (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <span className="material-symbols-outlined">cancel</span>
                          <span className="font-medium">Sai. Thử lại!</span>
                        </div>
                      )}

                      {/* Submit button */}
                      <button
                        onClick={checkAnswer}
                        disabled={!userAnswer.trim() || answerFeedback === 'correct'}
                        className="flex items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-base font-bold transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Kiểm Tra</span>
                      </button>

                      {/* Show Answer button after wrong attempts */}
                      {wrongAttempts >= 2 && (
                        <button
                          onClick={handleShowAnswer}
                          className="flex items-center justify-center gap-2 rounded-lg h-10 px-5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                          <span>Xem Đáp Án</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full border-t border-gray-200 dark:border-gray-700 my-4"></div>
                    <p className="text-gray-800 dark:text-white text-xl font-semibold tracking-tight">
                      {currentCard?.back || 'Loading...'}
                    </p>
                    
                    {/* Continue button after showing answer (especially after 2 wrong attempts) */}
                    {wrongAttempts >= 2 && (
                      <div className="mt-6 w-full max-w-md">
                        <button
                          onClick={() => handleAnswer(1)}
                          className="flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-primary text-white text-base font-bold transition-colors hover:bg-primary/90 w-full"
                        >
                          <span className="material-symbols-outlined">arrow_forward</span>
                          <span>Tiếp Tục Phiên</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Next Review Info */}
          {nextReview !== null && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal text-center">
                Lần ôn tập tiếp theo: ~{nextReview} {nextReview === 1 ? 'ngày' : 'ngày'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
