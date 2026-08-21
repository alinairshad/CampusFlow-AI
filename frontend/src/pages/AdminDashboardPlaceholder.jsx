/**
 * Admin Dashboard — document management UI.
 * Replaces the Stage 0 placeholder. Full admin dashboard (stats, directory)
 * comes in Stage 8; this page delivers the document upload/list feature (Stage 2).
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import DocumentUploadForm from '../features/admin/DocumentUploadForm'
import DocumentList from '../features/admin/DocumentList'
import { listDocuments } from '../api/documents'

export default function AdminDashboardPlaceholder() {
  const { user, token, logout } = useAuth()

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const data = await listDocuments(token)
      setDocuments(data.documents)
    } catch (err) {
      const detail = err.response?.data?.detail
      setListError(typeof detail === 'string' ? detail : 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [token])

  // Load on mount
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-indigo-600">CampusFlow AI</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 hidden sm:block">
            {user?.user_id}
          </span>
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:text-red-700 hover:underline transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload university documents to power the AI assistant.
          </p>
        </div>

        {/* Upload form */}
        <DocumentUploadForm
          token={token}
          onUploaded={fetchDocuments}
        />

        {/* List error */}
        {listError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {listError}
          </p>
        )}

        {/* Document list */}
        <DocumentList
          documents={documents}
          token={token}
          loading={loading}
          onDeleted={fetchDocuments}
        />
      </main>
    </div>
  )
}
