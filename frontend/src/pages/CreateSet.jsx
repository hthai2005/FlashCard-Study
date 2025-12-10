import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function CreateSet() {
  const navigate = useNavigate()
  const [setData, setSetData] = useState({
    title: '',
    description: '',
    is_public: false
  })
  const [cards, setCards] = useState([
    { front: '', back: '' },
    { front: '', back: '' },
    { front: '', back: '' }
  ])

  const handleSetDataChange = (field, value) => {
    setSetData(prev => ({ ...prev, [field]: value }))
  }

  const handleCardChange = (index, field, value) => {
    const newCards = [...cards]
    newCards[index][field] = value
    setCards(newCards)
  }

  const addCard = () => {
    setCards([...cards, { front: '', back: '' }])
  }

  const removeCard = (index) => {
    if (cards.length > 1) {
      const newCards = cards.filter((_, i) => i !== index)
      setCards(newCards)
    } else {
      toast.error('Cần ít nhất một thẻ')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!setData.title.trim()) {
      toast.error('Vui lòng nhập tên bộ thẻ')
      return
    }

    const validCards = cards.filter(card => card.front.trim() && card.back.trim())
    if (validCards.length === 0) {
      toast.error('Vui lòng thêm ít nhất một thẻ có cả mặt trước và mặt sau')
      return
    }

    try {
      // Create the set
      const setResponse = await api.post('/api/flashcards/sets', setData)
      const setId = setResponse.data.id

      // Add all cards
      for (const card of validCards) {
        await api.post(`/api/flashcards/sets/${setId}/cards`, {
          front: card.front,
          back: card.back
        })
      }

      toast.success(`Đã tạo bộ thẻ với ${validCards.length} thẻ!`)
      // Navigate to sets page - it will auto-refresh due to location.pathname dependency
      navigate('/sets')
    } catch (error) {
      console.error('Error creating set:', error)
      toast.error(error.response?.data?.detail || 'Không thể tạo bộ thẻ')
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden">
      <TopNav />
      
      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-between gap-4 pb-8">
            <div className="flex min-w-72 flex-col gap-2">
              <h1 className="text-black dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                Tạo Bộ Thẻ Mới
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
                Điền thông tin bên dưới để bắt đầu bộ học mới của bạn.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/sets')}
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-slate-200 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary text-sm font-bold text-white hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">add_circle</span>
                Tạo Bộ Thẻ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Set Details */}
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <h2 className="text-black dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4">
                  Chi Tiết Bộ Thẻ
                </h2>
                <div className="space-y-6">
                  <label className="flex flex-col w-full">
                    <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-normal pb-2">
                      Tên Bộ Thẻ
                    </p>
                    <input
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-black dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 h-12 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal"
                      placeholder="Ví dụ: Sinh Học Chương 5: Phân Bào"
                      value={setData.title}
                      onChange={(e) => handleSetDataChange('title', e.target.value)}
                    />
                  </label>

                  <label className="flex flex-col w-full">
                    <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-normal pb-2">
                      Mô Tả Bộ Thẻ (tùy chọn)
                    </p>
                    <textarea
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-black dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 min-h-36 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal"
                      placeholder="Thêm mô tả ngắn để giúp bạn nhớ bộ thẻ này về cái gì."
                      value={setData.description}
                      onChange={(e) => handleSetDataChange('description', e.target.value)}
                    />
                  </label>

                  <div className="flex flex-col w-full">
                    <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-normal pb-2">
                      Hiển Thị
                    </p>
                    <div className="flex gap-2 rounded-lg bg-slate-200 dark:bg-slate-800 p-1">
                      <button
                        type="button"
                        onClick={() => handleSetDataChange('is_public', false)}
                        className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-sm font-bold transition-colors ${
                          !setData.is_public
                            ? 'bg-primary text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-black/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">lock</span>
                        Riêng Tư
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDataChange('is_public', true)}
                        className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium transition-colors ${
                          setData.is_public
                            ? 'bg-primary text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-black/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">public</span>
                        Công Khai
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Cards */}
            <div className="lg:col-span-8">
              <h2 className="text-black dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4">
                Thẻ Trong Bộ Này
              </h2>
              <div className="flex flex-col gap-4">
                {cards.map((card, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-4"
                  >
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <span className="text-slate-500 dark:text-slate-400 font-bold">
                        {index + 1}
                      </span>
                      <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab">
                        <span className="material-symbols-outlined">drag_indicator</span>
                      </button>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col w-full">
                        <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal pb-2">
                          Mặt Trước
                        </p>
                        <textarea
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-black dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 min-h-24 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-3 text-base font-normal"
                          placeholder="Nhập nội dung mặt trước"
                          value={card.front}
                          onChange={(e) => handleCardChange(index, 'front', e.target.value)}
                        />
                      </label>
                      <label className="flex flex-col w-full">
                        <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal pb-2">
                          Mặt Sau
                        </p>
                        <textarea
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-black dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 min-h-24 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-3 text-base font-normal"
                          placeholder="Nhập nội dung mặt sau"
                          value={card.back}
                          onChange={(e) => handleCardChange(index, 'back', e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={() => removeCard(index)}
                        className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-500 transition-colors"
                        title="Xóa thẻ"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addCard}
                  className="mt-4 flex items-center justify-center gap-2 w-full h-14 rounded-lg bg-primary/10 border-2 border-dashed border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-2xl">add</span>
                  <span className="font-bold">Thêm Thẻ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
