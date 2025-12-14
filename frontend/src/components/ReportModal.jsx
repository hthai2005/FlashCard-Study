import { useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useNotifications } from '../contexts/NotificationContext'

export default function ReportModal({ itemType, itemId, itemTitle, onClose }) {
  const { addNotificationForUser } = useNotifications()
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reasons = [
    { value: 'inappropriate', label: 'Nội dung không phù hợp' },
    { value: 'copyright', label: 'Vi phạm bản quyền' },
    { value: 'spam', label: 'Spam/Quảng cáo' },
    { value: 'misinformation', label: 'Nội dung sai lệch' },
    { value: 'other', label: 'Khác' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!reason) {
      toast.error('Vui lòng chọn lý do báo cáo')
      return
    }

    try {
      setIsSubmitting(true)
      await api.post('/api/reports', {
        report_type: itemType,
        reported_item_id: itemId,
        reason: reason,
        description: description.trim() || null
      })
      
      // Get all admins and send notification
      try {
        const adminsRes = await api.get('/api/admin/admins')
        const admins = adminsRes.data || []
        
        admins.forEach(admin => {
          addNotificationForUser(admin.id, {
            type: 'warning',
            title: 'Báo cáo mới',
            message: `Có báo cáo mới về ${itemType === 'deck' ? 'deck' : 'thẻ'}: ${itemTitle}`,
            action: {
              type: 'navigate',
              path: '/admin/content-moderation'
            }
          })
        })
      } catch (error) {
        console.error('Error notifying admins:', error)
        // Continue even if notification fails
      }
      
      toast.success('Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý.')
      onClose()
    } catch (error) {
      console.error('Error submitting report:', error)
      const errorMessage = error.response?.data?.detail || 'Không thể gửi báo cáo'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Báo Cáo Nội Dung</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Bạn đang báo cáo: <span className="font-medium">{itemTitle}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lý do báo cáo <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mô tả chi tiết (tùy chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows="4"
              placeholder="Vui lòng mô tả chi tiết về vấn đề..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi Báo Cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

