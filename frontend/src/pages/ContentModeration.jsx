import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import AdminSidebar from '../components/AdminSidebar'
import AdminHeader from '../components/AdminHeader'

export default function ContentModeration() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [moderatorNotes, setModeratorNotes] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCards, setEditingCards] = useState([])

  useEffect(() => {
    if (user && !authLoading) {
      fetchReports()
    }
  }, [user, authLoading, activeTab])

  const fetchReports = async () => {
    try {
      // Mock data for now - in production, this would fetch from API
      const mockReports = [
        {
          id: 1,
          setTitle: 'Advanced Spanish Vocabulary',
          setCreator: 'CreatorPro',
          reportedBy: 'JaneDoe',
          reportDate: '2023-10-26',
          reason: 'Inappropriate Content',
          priority: 'high',
          status: 'pending',
          comment: 'This flashcard set contains offensive language and slurs in multiple cards. It should be removed immediately.',
          cards: [
            { id: 1, front: 'El pan', back: 'Bread', flagged: false },
            { id: 2, front: 'Una palabra ofensiva', back: 'An offensive word', flagged: true },
            { id: 3, front: 'La manzana', back: 'Apple', flagged: false }
          ]
        },
        {
          id: 2,
          setTitle: 'WWII History Facts',
          setCreator: 'HistoryBuff',
          reportedBy: 'JohnSmith',
          reportDate: '2023-10-25',
          reason: 'Misinformation',
          priority: 'medium',
          status: 'in_review',
          comment: 'Some historical facts appear to be incorrect.',
          cards: [
            { id: 1, front: 'WWII Start Date', back: '1939', flagged: false },
            { id: 2, front: 'WWII End Date', back: '1945', flagged: false }
          ]
        },
        {
          id: 3,
          setTitle: 'Calculus 101 Formulas',
          setCreator: 'MathTeacher',
          reportedBy: 'User12345',
          reportDate: '2023-10-24',
          reason: 'Spam',
          priority: 'low',
          status: 'new',
          comment: 'This appears to be spam content.',
          cards: [
            { id: 1, front: 'Derivative', back: 'd/dx', flagged: false }
          ]
        },
        {
          id: 4,
          setTitle: 'Organic Chemistry Reactions',
          setCreator: 'ChemStudent',
          reportedBy: 'AcademicWatch',
          reportDate: '2023-10-23',
          reason: 'Copyright Violation',
          priority: 'low',
          status: 'new',
          comment: 'Content appears to be copied from copyrighted material.',
          cards: [
            { id: 1, front: 'Reaction 1', back: 'Product 1', flagged: false }
          ]
        }
      ]

      // Filter by active tab
      let filteredReports = mockReports
      if (activeTab === 'pending') {
        filteredReports = mockReports.filter(r => r.status === 'pending' || r.status === 'new' || r.status === 'in_review')
      } else if (activeTab === 'resolved') {
        filteredReports = mockReports.filter(r => r.status === 'resolved')
      }

      setReports(filteredReports)
      
      // Auto-select first report if available
      if (filteredReports.length > 0 && !selectedReport) {
        setSelectedReport(filteredReports[0])
      }
    } catch (error) {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectReport = (report) => {
    setSelectedReport(report)
    setModeratorNotes('')
  }

  const handleApprove = async () => {
    if (!selectedReport) return
    
    try {
      // In production, this would call an API
      toast.success('Report approved. Content has been kept.')
      setReports(prev => prev.filter(r => r.id !== selectedReport.id))
      setSelectedReport(null)
      fetchReports()
    } catch (error) {
      toast.error('Failed to approve report')
    }
  }

  const handleReject = async () => {
    if (!selectedReport) return
    
    if (window.confirm('Are you sure you want to reject and remove this content?')) {
      try {
        // In production, this would call an API to delete the set
        toast.success('Content has been removed.')
        setReports(prev => prev.filter(r => r.id !== selectedReport.id))
        setSelectedReport(null)
        fetchReports()
      } catch (error) {
        toast.error('Failed to reject content')
      }
    }
  }

  const handleEdit = () => {
    if (!selectedReport) return
    setEditingCards([...selectedReport.cards])
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedReport) return
    
    try {
      // In production, this would call an API to update the cards
      toast.success('Content updated successfully')
      setShowEditModal(false)
      // Update the selected report with edited cards
      setSelectedReport({ ...selectedReport, cards: editingCards })
      fetchReports()
    } catch (error) {
      toast.error('Failed to update content')
    }
  }

  const handleCardEdit = (cardId, field, value) => {
    setEditingCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, [field]: value } : card
    ))
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'High Priority' },
      medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'In Review' },
      low: { bg: 'bg-gray-500/20', text: 'text-gray-500', label: 'New' }
    }
    return badges[priority] || badges.low
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'High Priority' },
      in_review: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'In Review' },
      new: { bg: 'bg-gray-500/20', text: 'text-gray-500', label: 'New' },
      resolved: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Resolved' }
    }
    return badges[status] || badges.new
  }

  const filteredReports = reports.filter(report =>
    report.setTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.reportedBy?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      <AdminHeader pageTitle="Content Moderation" />

      <div className="flex h-[calc(100vh-4rem)] grow">
        <AdminSidebar />

        {/* Main Content Area */}
        <main className="flex flex-1 overflow-hidden">
          {/* Content Queue List */}
          <div className="flex w-full flex-col overflow-y-auto border-r border-gray-200/10 dark:border-white/10 lg:w-2/5">
            <div className="sticky top-0 z-10 border-b border-gray-200/10 dark:border-white/10 bg-background-light/80 p-4 backdrop-blur-sm dark:bg-background-dark/80">
              <p className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Content Moderation
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review and manage reported content.
              </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200/10 dark:border-white/10 px-4">
              <div className="flex gap-6">
                <a
                  onClick={(e) => {
                    e.preventDefault()
                    setActiveTab('pending')
                    setSelectedReport(null)
                  }}
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 cursor-pointer ${
                    activeTab === 'pending'
                      ? 'border-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <p className={`text-sm ${activeTab === 'pending' ? 'font-bold text-primary' : 'font-medium'}`}>
                    Pending Review
                  </p>
                </a>
                <a
                  onClick={(e) => {
                    e.preventDefault()
                    setActiveTab('resolved')
                    setSelectedReport(null)
                  }}
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 cursor-pointer ${
                    activeTab === 'resolved'
                      ? 'border-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <p className={`text-sm ${activeTab === 'resolved' ? 'font-bold text-primary' : 'font-medium'}`}>
                    Resolved Cases
                  </p>
                </a>
                <a
                  onClick={(e) => {
                    e.preventDefault()
                    setActiveTab('all')
                    setSelectedReport(null)
                  }}
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 cursor-pointer ${
                    activeTab === 'all'
                      ? 'border-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <p className={`text-sm ${activeTab === 'all' ? 'font-bold text-primary' : 'font-medium'}`}>
                    All Reports
                  </p>
                </a>
              </div>
            </div>

            {/* Search */}
            <div className="p-4">
              <label className="flex h-11 w-full flex-col">
                <div className="flex h-full w-full flex-1 items-stretch rounded-lg">
                  <div className="flex items-center justify-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 pl-3 text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                    <span className="material-symbols-outlined text-xl">search</span>
                  </div>
                  <input
                    className="form-input h-full w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg border border-l-0 border-gray-300 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Search by title or user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {/* Report List */}
            <div className="flex-1 overflow-y-auto">
              {filteredReports.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No reports found
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = selectedReport?.id === report.id
                  const badge = getStatusBadge(report.status)
                  
                  return (
                    <div
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      className={`border-b p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-l-4 border-primary bg-primary/10 dark:border-primary dark:bg-primary/20'
                          : 'border-gray-200/10 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3
                          className={`${
                            isSelected ? 'font-bold' : 'font-semibold'
                          } text-gray-900 dark:text-white`}
                        >
                          {report.setTitle}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Reported for: <span className="font-medium">{report.reason}</span>
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Reported by: {report.reportedBy}</span>
                        <span>{formatDate(report.reportDate)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Detail & Action Panel */}
          {selectedReport ? (
            <div className="hidden w-full flex-col overflow-y-auto bg-gray-100/50 dark:bg-gray-900/40 lg:flex lg:w-3/5">
              <div className="space-y-6 p-6">
                {/* Report Info */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report Details</h2>
                  <div className="mt-3 rounded-lg border border-gray-200/10 bg-background-light p-4 dark:border-white/10 dark:bg-background-dark">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Reported Set</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedReport.setTitle}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Set Creator</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedReport.setCreator}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Reported By</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedReport.reportedBy}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Report Date</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatDate(selectedReport.reportDate)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500 dark:text-gray-400">Reason</p>
                        <p className="font-semibold text-red-500">{selectedReport.reason}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500 dark:text-gray-400">Reporter's Comment</p>
                        <p className="rounded bg-gray-100 p-2 italic dark:bg-gray-800/50 text-gray-900 dark:text-white">
                          "{selectedReport.comment}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Content Preview</h2>
                  <div className="mt-3 h-64 overflow-y-auto rounded-lg border border-gray-200/10 bg-background-light p-4 dark:border-white/10 dark:bg-background-dark">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {selectedReport.cards?.map((card) => (
                        <div key={card.id}>
                          <div
                            className={`rounded border p-3 ${
                              card.flagged
                                ? 'border-red-500/50 bg-red-500/10 dark:border-red-500/60 dark:bg-red-500/20'
                                : 'border-gray-200/10 dark:border-white/10'
                            }`}
                          >
                            <p
                              className={`text-xs ${
                                card.flagged ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              Card {card.id}: Front{card.flagged ? ' (Flagged)' : ''}
                            </p>
                            <p
                              className={`${
                                card.flagged
                                  ? 'text-red-800 dark:text-red-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {card.front}
                            </p>
                          </div>
                          <div
                            className={`mt-2 rounded border p-3 ${
                              card.flagged
                                ? 'border-red-500/50 bg-red-500/10 dark:border-red-500/60 dark:bg-red-500/20'
                                : 'border-gray-200/10 dark:border-white/10'
                            }`}
                          >
                            <p
                              className={`text-xs ${
                                card.flagged ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              Card {card.id}: Back{card.flagged ? ' (Flagged)' : ''}
                            </p>
                            <p
                              className={`${
                                card.flagged
                                  ? 'text-red-800 dark:text-red-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {card.back}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Moderator Actions */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Moderator Actions</h2>
                  <div className="mt-3 space-y-4">
                    <textarea
                      className="form-textarea w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
                      placeholder="Add internal notes (optional)..."
                      rows="3"
                      value={moderatorNotes}
                      onChange={(e) => setModeratorNotes(e.target.value)}
                    ></textarea>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleApprove}
                        className="flex h-10 min-w-[120px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-emerald-500 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
                      >
                        <span className="material-symbols-outlined">check_circle</span>
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={handleReject}
                        className="flex h-10 min-w-[120px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-700"
                      >
                        <span className="material-symbols-outlined">delete_forever</span>
                        <span>Reject & Remove</span>
                      </button>
                      <button
                        onClick={handleEdit}
                        className="flex h-10 min-w-[120px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-gray-300 px-4 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <span className="material-symbols-outlined">edit</span>
                        <span>Edit Content</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden w-full flex-col items-center justify-center bg-gray-100/50 dark:bg-gray-900/40 lg:flex lg:w-3/5">
              <p className="text-gray-500 dark:text-gray-400">Select a report to view details</p>
            </div>
          )}
        </main>
      </div>

      {/* Edit Content Modal */}
      {showEditModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Content</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingCards([])
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Editing: <span className="font-semibold">{selectedReport.setTitle}</span>
              </p>

              {editingCards.map((card) => (
                <div key={card.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Card {card.id}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={card.flagged || false}
                        onChange={(e) => handleCardEdit(card.id, 'flagged', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Flagged</span>
                    </label>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Front
                      </label>
                      <textarea
                        value={card.front}
                        onChange={(e) => handleCardEdit(card.id, 'front', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        rows="2"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Back
                      </label>
                      <textarea
                        value={card.back}
                        onChange={(e) => handleCardEdit(card.id, 'back', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingCards([])
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

