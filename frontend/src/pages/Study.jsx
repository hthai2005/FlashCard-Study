import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Study() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
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

  useEffect(() => {
    startSession()
    fetchSetInfo()
    fetchCards()
  }, [setId])

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

  const fetchSetInfo = async () => {
    try {
      const response = await api.get(`/api/flashcards/sets/${setId}`)
      setSetInfo(response.data)
      
      // Get total cards count
      const cardsRes = await api.get(`/api/flashcards/sets/${setId}/cards`)
      setTotalCards(cardsRes.data.length)
    } catch (error) {
      toast.error('Không thể tải thông tin bộ thẻ')
    }
  }

  const fetchCards = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching due cards:', error)
      toast.error('Failed to load flashcards')
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

      // Get next review info
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
      
      toast.success(`Hoàn thành phiên học! Bạn đã học ${finalStats.studied}/${cards.length} thẻ.`)
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
    
    if (stats.studied > 0 && totalCardsCount > 0) {
      const percentage = Math.round((stats.studied / totalCardsCount) * 100)
      progressMessage = `Bạn đã học ${stats.studied}/${totalCardsCount} thẻ (${percentage}%). Bạn có muốn kết thúc phiên học này?`
    }
    
    if (window.confirm(progressMessage)) {
      if (sessionId) {
        await completeSession(stats)
      } else {
        navigate('/dashboard')
      }
    }
  }

  if (cards.length === 0) {
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
              Về Bộ Thẻ
            </button>
          </div>
        </main>
      </div>
    )
  }

  const currentCard = cards[currentIndex]
  // Use totalCards if available, otherwise use cards.length for progress calculation
  const totalCardsCount = totalCards > 0 ? totalCards : cards.length
  const progressPercentage = totalCardsCount > 0 ? (stats.studied / totalCardsCount) * 100 : 0

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
                {stats.studied}/{totalCardsCount} thẻ đã ôn tập
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Rating Buttons - Always visible */}
          <div className="flex justify-center">
            <div className="flex flex-1 gap-3 flex-wrap px-4 py-3 max-w-lg justify-center">
              <button
                onClick={() => handleAnswer(1)}
                disabled={!showAnswer}
                className={`flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 transition-colors text-base font-bold leading-normal grow ${
                  showAnswer
                    ? 'bg-[#E57373]/10 text-[#E57373] hover:bg-[#E57373]/20'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>Khó</span>
              </button>
              <button
                onClick={() => handleAnswer(3)}
                disabled={!showAnswer}
                className={`flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 transition-colors text-base font-bold leading-normal grow ${
                  showAnswer
                    ? 'bg-[#81C784]/10 text-[#81C784] hover:bg-[#81C784]/20'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>Tốt</span>
              </button>
              <button
                onClick={() => handleAnswer(5)}
                disabled={!showAnswer}
                className={`flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 transition-colors text-base font-bold leading-normal grow ${
                  showAnswer
                    ? 'bg-[#64B5F6]/10 text-[#64B5F6] hover:bg-[#64B5F6]/20'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>Dễ</span>
              </button>
            </div>
          </div>

          {/* Next Review Info */}
          {nextReview !== null && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal text-center">
                Ôn tập lại sau: ~{nextReview} {nextReview === 1 ? 'ngày' : 'ngày'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
