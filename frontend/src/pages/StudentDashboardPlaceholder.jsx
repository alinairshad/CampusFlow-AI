/**
 * Student Dashboard (Stage 7 — replaces placeholder).
 *
 * Sections:
 *   1. Profile summary card  (name, department, semester, batch, email)
 *   2. Quick-access nav cards (Assistant, Applications, Directory)
 *   3. Recent Applications widget (up to 5, any status, status badge)
 *   4. Recent Conversations widget (up to 3, first-message preview, Continue link)
 *
 * Data: single GET /students/dashboard call on mount — one network request.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getStudentDashboard } from '../api/students'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return formatDate(iso)
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const isDownloaded = status === 'downloaded'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                      ${isDownloaded
                        ? 'bg-green-100 text-green-700'
                        : 'bg-indigo-100 text-indigo-700'}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block
                        ${isDownloaded ? 'bg-green-500' : 'bg-indigo-500'}`} />
      {isDownloaded ? 'Downloaded' : 'Generated'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Profile summary card
// ---------------------------------------------------------------------------

function ProfileCard({ profile }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-4">
        {/* Avatar initials */}
        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-indigo-700 text-xl font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{profile.name}</h2>
          <p className="text-sm text-gray-500 truncate">{profile.email}</p>
        </div>
      </div>

      {/* Detail pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { label: 'Dept',     value: profile.department },
          { label: 'Semester', value: profile.semester },
          { label: 'Batch',    value: profile.batch },
        ].map(({ label, value }) => (
          <div key={label}
               className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200
                          rounded-full px-3 py-1">
            <span className="font-medium text-gray-500">{label}</span>
            <span className="text-gray-800">{value}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Member since {formatDate(profile.created_at)}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent Applications widget
// ---------------------------------------------------------------------------

function RecentApplications({ applications }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Applications</h3>
        <Link to="/applications"
              className="text-xs text-indigo-600 hover:underline">
          New application
        </Link>
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No applications yet.{' '}
          <Link to="/applications" className="text-indigo-600 hover:underline">
            Generate one
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {applications.map((app) => (
            <li key={app.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {app.type_label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(app.created_at)}</p>
              </div>
              <StatusBadge status={app.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent Conversations widget
// ---------------------------------------------------------------------------

function RecentConversations({ conversations }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Conversations</h3>
        <Link to="/assistant"
              className="text-xs text-indigo-600 hover:underline">
          New chat
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No conversations yet.{' '}
          <Link to="/assistant" className="text-indigo-600 hover:underline">
            Start chatting
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {conversations.map((conv) => (
            <li key={conv.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700 truncate leading-snug">
                  {conv.first_message_preview || '(no messages)'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {conv.message_count} message{conv.message_count !== 1 ? 's' : ''} ·{' '}
                  {timeAgo(conv.updated_at)}
                </p>
              </div>
              <Link
                to="/assistant"
                className="shrink-0 text-xs text-indigo-600 hover:underline whitespace-nowrap"
              >
                Continue →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function StudentDashboardPlaceholder() {
  const { token, logout } = useAuth()

  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getStudentDashboard(token)
        setDashboard(data)
      } catch (err) {
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'Failed to load dashboard.')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold text-indigo-600">CampusFlow AI</span>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-indigo-400"
                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        ) : dashboard ? (
          <>
            {/* 1. Profile summary */}
            <ProfileCard profile={dashboard.profile} />

            {/* 2. Quick-access navigation */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Assistant',     sub: 'Ask anything',          to: '/assistant',    icon: 'AI' },
                { label: 'Applications',  sub: 'Letters & forms',       to: '/applications', icon: '✉' },
                { label: 'Directory',     sub: 'Offices & contacts',    to: '/directory',    icon: '🏢' },
              ].map(({ label, sub, to, icon }) => (
                <Link key={label} to={to}
                      className="bg-white rounded-2xl border border-gray-200 p-4 text-center
                                 hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center
                                  justify-center mx-auto mb-2">
                    <span className="text-indigo-600 text-sm font-bold">{icon}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </Link>
              ))}
            </div>

            {/* 3. Recent Applications */}
            <RecentApplications applications={dashboard.recent_applications} />

            {/* 4. Recent Conversations */}
            <RecentConversations conversations={dashboard.recent_conversations} />
          </>
        ) : null}
      </main>
    </div>
  )
}
