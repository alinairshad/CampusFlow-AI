/**
 * Student Dashboard (Stage 7 + Stage 13 mentor toggle).
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getStudentDashboard, updateStudentProfile } from '../api/students'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

function StatusBadge({ status }) {
  const dl = status === 'downloaded'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${dl ? 'bg-green-100 text-green-700' : 'bg-lgu-100 text-lgu-700'}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${dl ? 'bg-green-500' : 'bg-lgu-500'}`} />
      {dl ? 'Downloaded' : 'Generated'}
    </span>
  )
}

function ProfileCard({ profile, token }) {
  const [isMentor, setIsMentor]     = useState(profile.is_mentor ?? false)
  const [toggling, setToggling]     = useState(false)
  const [toggleError, setToggleError] = useState('')

  async function handleToggle() {
    setToggling(true)
    setToggleError('')
    const next = !isMentor
    try {
      const updated = await updateStudentProfile({ is_mentor: next }, token)
      setIsMentor(updated.is_mentor)
    } catch (err) {
      const detail = err.response?.data?.detail
      setToggleError(typeof detail === 'string' ? detail : 'Update failed.')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-lgu-100 flex items-center justify-center shrink-0">
          <span className="text-lgu-700 text-xl font-bold">{profile.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{profile.name}</h2>
          <p className="text-sm text-gray-500 truncate">{profile.email}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[{ label: 'Dept', value: profile.department }, { label: 'Semester', value: profile.semester }, { label: 'Batch', value: profile.batch }].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
            <span className="font-medium text-gray-500">{label}</span>
            <span className="text-gray-800">{value}</span>
          </div>
        ))}
      </div>

      {/* Mentor availability toggle */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">Available as mentor</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isMentor
              ? 'You appear in the Mentors directory. Fellow students can find and contact you.'
              : 'Enable to appear in the Mentors directory and help junior students.'}
          </p>
          {toggleError && (
            <p className="text-xs text-red-500 mt-1">{toggleError}</p>
          )}
        </div>

        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-pressed={isMentor}
          aria-label="Toggle mentor availability"
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-lgu-400 focus:ring-offset-1
                       disabled:opacity-50
                       ${isMentor ? 'bg-lgu-700' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow
                            transition-transform duration-200
                            ${isMentor ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400">Member since {formatDate(profile.created_at)}</p>
    </div>
  )
}

function RecentApplications({ applications }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Applications</h3>
        <Link to="/applications" className="text-xs text-lgu-700 hover:underline">New application</Link>
      </div>
      {applications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No applications yet.{' '}
          <Link to="/applications" className="text-lgu-700 hover:underline">Generate one</Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {applications.map(app => (
            <li key={app.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{app.type_label}</p>
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

function RecentConversations({ conversations }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Conversations</h3>
        <Link to="/assistant" className="text-xs text-lgu-700 hover:underline">New chat</Link>
      </div>
      {conversations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No conversations yet.{' '}
          <Link to="/assistant" className="text-lgu-700 hover:underline">Start chatting</Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {conversations.map(conv => (
            <li key={conv.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700 truncate leading-snug">{conv.first_message_preview || '(no messages)'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{conv.message_count} message{conv.message_count !== 1 ? 's' : ''} · {timeAgo(conv.updated_at)}</p>
              </div>
              <Link to="/assistant" className="shrink-0 text-xs text-lgu-700 hover:underline whitespace-nowrap">Continue →</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function StudentDashboardPlaceholder() {
  const { token, logout } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try { setDashboard(await getStudentDashboard(token)) }
      catch (err) { setError(err.response?.data?.detail || 'Failed to load dashboard.') }
      finally { setLoading(false) }
    })()
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/lgu-logo.png" alt="LGU" className="h-8 w-auto" />
          <span className="text-lg font-bold text-lgu-700">LGU AI Assistant</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors">Sign out</button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-lgu-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        ) : dashboard ? (
          <>
            <ProfileCard profile={dashboard.profile} token={token} />
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Assistant', sub: 'Ask anything', to: '/assistant', icon: 'AI' },
                { label: 'Applications', sub: 'Letters & forms', to: '/applications', icon: '✉' },
                { label: 'Directory', sub: 'Offices & contacts', to: '/directory', icon: '🏢' },
              ].map(({ label, sub, to, icon }) => (
                <Link key={label} to={to}
                      className="bg-white rounded-2xl border border-gray-200 p-4 text-center hover:border-lgu-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-full bg-lgu-100 flex items-center justify-center mx-auto mb-2">
                    <span className="text-lgu-700 text-sm font-bold">{icon}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </Link>
              ))}
            </div>
            {/* Societies card — full width below the 3-col grid */}
            <Link to="/societies"
                  className="bg-white rounded-2xl border border-gray-200 p-4
                             flex items-center gap-4
                             hover:border-lgu-300 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-full bg-lgu-100 flex items-center justify-center shrink-0">
                <span className="text-lgu-700 text-sm font-bold">🎓</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Societies</p>
                <p className="text-xs text-gray-400 mt-0.5">Clubs, sports, arts & more</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                   className="w-4 h-4 text-gray-400 ml-auto shrink-0">
                <path fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd" />
              </svg>
            </Link>
            {/* Mentors card */}
            <Link to="/mentors"
                  className="bg-white rounded-2xl border border-gray-200 p-4
                             flex items-center gap-4
                             hover:border-lgu-300 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-full bg-lgu-100 flex items-center justify-center shrink-0">
                <span className="text-lgu-700 text-sm font-bold">🤝</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Mentors</p>
                <p className="text-xs text-gray-400 mt-0.5">Find a senior student for peer guidance</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                   className="w-4 h-4 text-gray-400 ml-auto shrink-0">
                <path fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd" />
              </svg>
            </Link>
            <RecentApplications applications={dashboard.recent_applications} />
            <RecentConversations conversations={dashboard.recent_conversations} />
          </>
        ) : null}
      </main>
    </div>
  )
}
