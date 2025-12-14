import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ReportModal from './ReportModal'

export default function ReportButton({ itemType, itemId, ownerId, itemTitle }) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  // Chỉ hiển thị nút nếu user không phải owner
  if (!user || user.id === ownerId) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex h-12 px-6 items-center justify-center rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-md gap-2"
        title="Báo cáo nội dung"
      >
        <span className="material-symbols-outlined text-xl">flag</span>
        <span>Báo cáo</span>
      </button>
      {showModal && (
        <ReportModal
          itemType={itemType}
          itemId={itemId}
          itemTitle={itemTitle}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

