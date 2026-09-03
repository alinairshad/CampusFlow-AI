/**
 * Admin Dashboard — sidebar layout matching the student dashboard redesign.
 * Functionality unchanged: document upload/list, directory, societies, stats.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import DocumentUploadForm from '../features/admin/DocumentUploadForm'
import DocumentList from '../features/admin/DocumentList'
import DirectoryManager from '../features/admin/DirectoryManager'
import SocietyManager from '../features/admin/SocietyManager'
import StatsWidget from '../features/admin/StatsWidget'
import { listDocuments } from '../api/documents'
import AdminSidebar from '../features/dashboard/AdminSidebar'

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------
function TopBar({ onMenuOpen }) {
  return (
    <div className="bg-white border-b border-gray-100 px-5 py-3
                    flex items-center justify-between shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        aria-label="Open navigation"
        className="md:hidden p-1.5 rounded-lg text-gray-500
                   hover:bg-gray-100 hover:text-lgu-700 transition-colors mr-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
             className="w-5 h-5">
          <path fillRule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd" />
        </svg>
      </button>

      <p className="text-sm font-semibold text-gray-700 hidden md:block">
        Admin Dashboard
      </p>

      {/* Admin badge */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs font-semibold text-lgu-700 bg-lgu-50
                         border border-lgu-100 px-2.5 py-1 rounded-lg">
          Admin
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------
function SectionHeading({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------
export default function AdminDashboardPlaceholder() {
  const { token, logout } = useAuth()

  const [documents,  setDocuments]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [listError,  setListError]  = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={logout}
      />

      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        <TopBar onMenuOpen={() => setSidebarOpen(true)} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <div className="max-w-3xl mx-auto space-y-7">

            {/* Welcome row */}
            <div className="animate-fade-in-up rounded-2xl px-6 py-5 text-white"
                 style={{ background: 'linear-gradient(120deg, #2E7D32 0%, #1B5E20 100%)' }}>
              <p className="text-xs font-medium text-white/60 mb-1">
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
              <h1 className="text-xl font-bold">Admin Control Panel</h1>
              <p className="text-sm text-white/70 mt-1">
                Manage knowledge base, directory entries, and societies.
              </p>
            </div>

            {/* ── Stats ───────────────────────────────────────────────── */}
            <section className="animate-fade-in-up" style={{ animationDelay: '0.06s' }}>
              <SectionHeading title="Overview" subtitle="Live counts across all modules" />
              <StatsWidget token={token} />
            </section>

            {/* ── Knowledge Base ──────────────────────────────────────── */}
            <section className="animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
              <SectionHeading
                title="Knowledge Base"
                subtitle="Upload and manage university documents for AI retrieval"
              />

              <div className="space-y-4">
                <DocumentUploadForm token={token} onUploaded={fetchDocuments} />

                {listError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200
                                rounded-xl px-4 py-2">
                    {listError}
                  </p>
                )}

                <DocumentList
                  documents={documents}
                  token={token}
                  loading={loading}
                  onDeleted={fetchDocuments}
                />
              </div>
            </section>

            {/* ── University Directory ─────────────────────────────────── */}
            <section className="animate-fade-in-up" style={{ animationDelay: '0.18s' }}>
              <SectionHeading
                title="University Directory"
                subtitle="Add or update department offices and contact information"
              />
              <DirectoryManager token={token} />
            </section>

            {/* ── University Societies ─────────────────────────────────── */}
            <section className="animate-fade-in-up" style={{ animationDelay: '0.24s' }}>
              <SectionHeading
                title="University Societies"
                subtitle="Manage student societies and club information"
              />
              <SocietyManager token={token} />
            </section>

          </div>
        </main>
      </div>
    </div>
  )
}
