/**
 * Student Dashboard — polished UI (Stage 7 + Stage 13 mentor toggle).
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getStudentDashboard, updateStudentProfile } from '../api/students'
import Navbar from '../components/Navbar'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
function timeAgo(iso) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 2)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return formatDate(iso)
}

function StatusBadge({ status }) {
  const dl = status === 'downloaded'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full
                      ${dl ? 'bg-green-100 text-green-700' : 'bg-lgu-50 text-lgu-700'}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block
                        ${dl ? 'bg-green-500' : 'bg-lgu-500'}`} />
      {dl ? 'Downloaded' : 'Generated'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Profile Card
// ---------------------------------------------------------------------------
function ProfileCard({ profile, token }) {
  const [isMentor, setIsMentor]       = useState(profile.is_mentor ?? false)
  const [toggling, setToggling]       = useState(false)
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
    <div className="animate-fade-in-up rounded-2xl overflow-hidden shadow-sm border border-lgu-200
                    hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                    bg-gradient-to-br from-lgu-600 to-lgu-800">
      <div className="p-6">

        {/* ── Header: avatar · name/email · crest ─────────────────── */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center
                          justify-center shrink-0 shadow-sm">
            <span className="text-white text-2xl font-bold select-none">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Name / email */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white leading-tight truncate">
              {profile.name}
            </h2>
            <p className="text-sm text-lgu-200 truncate mt-0.5">{profile.email}</p>
          </div>

          {/* LGU crest — clean white badge */}
          <div className="shrink-0 bg-white/90 rounded-xl p-2 shadow-sm">
            <img src="/lgu-logo.png" alt="LGU"
                 className="h-9 w-9 object-contain" />
          </div>
        </div>

        {/* ── Info pills ──────────────────────────────────────────── */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { label: 'Dept',     value: profile.department },
            { label: 'Semester', value: profile.semester   },
            { label: 'Batch',    value: profile.batch      },
          ].map(({ label, value }) => (
            <div key={label}
                 className="flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5
                            bg-white/15 text-white">
              <span className="text-lgu-200 font-medium">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>

        {/* ── Mentor toggle ───────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Available as mentor</p>
            <p className="text-xs text-lgu-200 mt-0.5">
              {isMentor
                ? 'You appear in the Mentors directory.'
                : 'Enable to help junior students.'}
            </p>
            {toggleError && (
              <p className="text-xs text-red-300 mt-1">{toggleError}</p>
            )}
          </div>

          <button
            onClick={handleToggle}
            disabled={toggling}
            aria-pressed={isMentor}
            aria-label="Toggle mentor availability"
            className={`relative shrink-0 w-12 h-6.5 rounded-full transition-all duration-300
                        focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2
                        focus:ring-offset-lgu-700 disabled:opacity-50
                        ${isMentor ? 'bg-white/90' : 'bg-white/25'}`}
            style={{ height: '1.625rem' }}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm
                              transition-all duration-300
                              ${isMentor ? 'translate-x-6 bg-lgu-600' : 'translate-x-0 bg-white'}`} />
          </button>
        </div>

        {/* ── Member since ─────────────────────────────────────────── */}
        <p className="mt-4 text-xs text-lgu-200/80">
          Member since {formatDate(profile.created_at)}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick-access nav tiles
// ---------------------------------------------------------------------------
const NAV_TILES = [
  { label: 'Assistant',    sub: 'Ask anything',                    to: '/assistant',    icon: '🤖', color: '#EEF4EE' },
  { label: 'Applications', sub: 'Letters & forms',                 to: '/applications', icon: '✉️', color: '#EEF4EE' },
  { label: 'Directory',    sub: 'Offices & contacts',              to: '/directory',    icon: '🏢', color: '#EEF4EE' },
  { label: 'Societies',    sub: 'Clubs, sports, arts & more',      to: '/societies',    icon: '🎓', color: '#EEF4EE' },
  { label: 'Mentors',      sub: 'Find a senior for peer guidance', to: '/mentors',      icon: '🤝', color: '#EEF4EE' },
]

function QuickAccess() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
                    animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
      <div className="divide-y divide-gray-50">
        {NAV_TILES.map(({ label, sub, to, icon, color }, idx) => (
          <Link
            key={label}
            to={to}
            className="group flex items-center gap-4 px-5 py-4
                       hover:bg-lgu-50/60 transition-all duration-150
                       animate-fade-in-up"
            style={{ animationDelay: `${0.18 + idx * 0.06}s` }}
          >
            {/* Icon */}
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                            transition-transform duration-150 group-hover:scale-105"
                 style={{ backgroundColor: color }}>
              <span className="text-lg leading-none transition-transform duration-150
                               group-hover:scale-110 inline-block"
                    role="img" aria-label={label}>{icon}</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-lgu-700
                             transition-colors">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>

            {/* Chevron */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                 className="w-4 h-4 text-gray-300 group-hover:text-lgu-400 shrink-0
                            transition-colors group-hover:translate-x-0.5 duration-150">
              <path fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent Applications
// ---------------------------------------------------------------------------
function RecentApplications({ applications }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
                    animate-fade-in-up" style={{ animationDelay: '0.52s' }}>
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Applications</h3>
        <Link to="/applications"
              className="text-xs font-medium text-lgu-600 hover:text-lgu-700
                         hover:underline transition-colors">
          New application
        </Link>
      </div>
      {applications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No applications yet.{' '}
          <Link to="/applications" className="text-lgu-600 hover:underline font-medium">
            Generate one
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {applications.map(app => (
            <li key={app.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
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

// ---------------------------------------------------------------------------
// Recent Conversations
// ---------------------------------------------------------------------------
function RecentConversations({ conversations }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
                    animate-fade-in-up" style={{ animationDelay: '0.58s' }}>
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Conversations</h3>
        <Link to="/assistant"
              className="text-xs font-medium text-lgu-600 hover:text-lgu-700
                         hover:underline transition-colors">
          New chat
        </Link>
      </div>
      {conversations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No conversations yet.{' '}
          <Link to="/assistant" className="text-lgu-600 hover:underline font-medium">
            Start chatting
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {conversations.map(conv => (
            <li key={conv.id}
                className="px-5 py-3.5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700 truncate leading-snug">
                  {conv.first_message_preview || '(no messages)'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {conv.message_count} message{conv.message_count !== 1 ? 's' : ''} · {timeAgo(conv.updated_at)}
                </p>
              </div>
              <Link to="/assistant"
                    className="shrink-0 text-xs font-medium text-lgu-600
                               hover:text-lgu-700 hover:underline whitespace-nowrap
                               transition-colors">
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
// Page root
// ---------------------------------------------------------------------------
export default function StudentDashboardPlaceholder() {
  const { token } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => {
    ;(async () => {
      try   { setDashboard(await getStudentDashboard(token)) }
      catch (err) { setError(err.response?.data?.detail || 'Failed to load dashboard.') }
      finally     { setLoading(false) }
    })()
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-5 py-7 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-lgu-400"
                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200
                        rounded-xl px-4 py-3">{error}</p>
        ) : dashboard ? (
          <>
            <ProfileCard profile={dashboard.profile} token={token} />
            <QuickAccess />
            <RecentApplications applications={dashboard.recent_applications} />
            <RecentConversations conversations={dashboard.recent_conversations} />
          </>
        ) : null}
      </main>
    </div>
  )
}
