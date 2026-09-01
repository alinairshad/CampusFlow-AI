/**
 * Admin Dashboard — document management + directory management.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import DocumentUploadForm from '../features/admin/DocumentUploadForm'
import DocumentList from '../features/admin/DocumentList'
import DirectoryManager from '../features/admin/DirectoryManager'
import SocietyManager from '../features/admin/SocietyManager'
import StatsWidget from '../features/admin/StatsWidget'
import { listDocuments } from '../api/documents'
import Navbar from '../components/Navbar'

export default function AdminDashboardPlaceholder() {
  const { token } = useAuth()

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
      <Navbar />

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage the university knowledge base and directory.
          </p>
        </div>

        {/* ── Stats overview ─────────────────────────────────────────────── */}
        <StatsWidget token={token} />

        {/* ── Knowledge Base ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Knowledge Base
          </h2>

          {/* Upload form */}
          <DocumentUploadForm
            token={token}
            onUploaded={fetchDocuments}
          />

          {/* List error */}
          {listError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-3">
              {listError}
            </p>
          )}

          {/* Document list */}
          <div className="mt-4">
            <DocumentList
              documents={documents}
              token={token}
              loading={loading}
              onDeleted={fetchDocuments}
            />
          </div>
        </div>

        {/* ── University Directory ──────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            University Directory
          </h2>
          <DirectoryManager token={token} />
        </div>

        {/* ── University Societies ──────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            University Societies
          </h2>
          <SocietyManager token={token} />
        </div>
      </main>
    </div>
  )
}
