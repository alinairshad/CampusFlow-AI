/**
 * Student Dashboard — Stage 7 + Stage 13 + Stage 17 sidebar layout redesign.
 *
 * Layout: DashboardSidebar (left, fixed) + scrollable main column (right).
 * All existing API calls and routes are unchanged.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getStudentDashboard, updateStudentProfile } from '../api/students'
import { listMentors } from '../api/mentors'
import DashboardSidebar from '../features/dashboard/DashboardSidebar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
function todayLong() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
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
  if (days  <  7) return `${days}d ago`
  return formatDate(iso)
}

function StatusBadge({ status }) {
  const done = status === 'downloaded'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                      ${done
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-lgu-50   text-lgu-700   border border-lgu-100'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-lgu-500'}`} />
      {done ? 'Downloaded' : 'Generated'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Mentor toggle (profile card)
// ---------------------------------------------------------------------------
function MentorToggle({ isMentor, toggling, onToggle }) {
  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      aria-pressed={isMentor}
      aria-label="Toggle mentor availability"
      style={{ height: '1.5rem' }}
      className={`relative shrink-0 w-11 rounded-full transition-all duration-300
                  focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2
                  focus:ring-offset-lgu-700 disabled:opacity-50 cursor-pointer
                  ${isMentor ? 'bg-white/80' : 'bg-white/20'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow
                        transition-all duration-300
                        ${isMentor ? 'translate-x-5 bg-lgu-600' : 'translate-x-0 bg-white/70'}`} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Welcome Banner
// ---------------------------------------------------------------------------
function WelcomeBanner({ name }) {
  return (
    <div className="rounded-2xl px-6 py-5 text-white animate-fade-in-up"
         style={{ background: 'linear-gradient(120deg, #2E7D32 0%, #1B5E20 100%)' }}>
      <p className="text-xs font-medium text-white/60 mb-1">{todayLong()}</p>
      <h1 className="text-2xl font-bold leading-snug">Welcome back, {name}!</h1>
      <p className="text-sm text-white/70 mt-1">
        Your university companion is ready to help.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats Row
// ---------------------------------------------------------------------------
function StatsRow({ appCount, convCount }) {
  const stats = [
    {
      label: 'Applications',
      value: appCount,
      sub: 'documents generated',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: 'Conversations',
      value: convCount,
      sub: 'AI chat sessions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
      {stats.map(({ label, value, sub, icon }) => (
        <div key={label}
             className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4
                        flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-lgu-50 border border-lgu-100
                          flex items-center justify-center text-lgu-600">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile Card (compact, inside main content)
// ---------------------------------------------------------------------------
function ProfileCard({ profile, token }) {
  const [isMentor,    setIsMentor]    = useState(profile.is_mentor ?? false)
  const [toggling,    setToggling]    = useState(false)
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4
                    animate-fade-in-up" style={{ animationDelay: '0.04s' }}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="shrink-0 w-10 h-10 rounded-xl bg-lgu-700 flex items-center justify-center">
          <span className="text-white text-base font-bold select-none">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
        {/* Name/email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{profile.name}</p>
          <p className="text-xs text-gray-400 truncate">{profile.email}</p>
        </div>
        {/* LGU crest */}
        <img src="/lgu-logo.png" alt="LGU" className="shrink-0 h-8 w-8 object-contain opacity-60" />
      </div>

      {/* Info chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          { label: 'Dept',     value: profile.department },
          { label: 'Sem',      value: profile.semester   },
          { label: 'Batch',    value: profile.batch      },
        ].map(({ label, value }) => (
          <span key={label}
                className="text-xs rounded-lg px-2.5 py-1 bg-gray-50 border border-gray-100
                           text-gray-600">
            <span className="text-gray-400 mr-1">{label}</span>
            <span className="font-semibold">{value}</span>
          </span>
        ))}
      </div>

      {/* Mentor toggle */}
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700">Available as mentor</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isMentor ? 'Listed in Mentors directory.' : 'Help junior students.'}
          </p>
          {toggleError && <p className="text-xs text-red-500 mt-1">{toggleError}</p>}
        </div>
        {/* Reuse toggle with green-on-white styling for light card */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-pressed={isMentor}
          aria-label="Toggle mentor availability"
          style={{ height: '1.5rem' }}
          className={`relative shrink-0 w-11 rounded-full transition-all duration-300
                      focus:outline-none focus:ring-2 focus:ring-lgu-300 focus:ring-offset-1
                      disabled:opacity-50 cursor-pointer
                      ${isMentor ? 'bg-lgu-600' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow
                            transition-all duration-300
                            ${isMentor ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-300">Member since {formatDate(profile.created_at)}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Applications Grid
// ---------------------------------------------------------------------------
function ApplicationsGrid({ applications }) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '0.16s' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800">Recent Applications</h2>
        <Link to="/applications"
              className="text-xs font-semibold text-white bg-lgu-700 hover:bg-lgu-600
                         px-3 py-1.5 rounded-lg transition-all duration-150 shadow-sm">
          + New
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
                        px-5 py-8 text-center">
          <p className="text-sm text-gray-500">No applications yet.</p>
          <Link to="/applications"
                className="mt-1.5 inline-flex text-xs font-medium text-lgu-600 hover:underline">
            Generate your first one →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {applications.map(app => (
            <div key={app.id}
                 className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4
                            hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-sm font-semibold text-gray-800 leading-snug">
                  {app.type_label}
                </p>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-xs text-gray-400 mb-3">{formatDate(app.created_at)}</p>
              <Link to="/applications"
                    className="inline-flex items-center gap-1 text-xs font-semibold
                               text-lgu-700 hover:text-lgu-600 transition-colors">
                View
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                     className="w-3 h-3">
                  <path fillRule="evenodd"
                    d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mentors Panel
// ---------------------------------------------------------------------------
function MentorsPanel({ mentors, error }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden
                    animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Available Mentors</h2>
        <Link to="/mentors"
              className="text-xs font-medium text-lgu-600 hover:text-lgu-700
                         hover:underline transition-colors">
          See all →
        </Link>
      </div>

      {error ? (
        <p className="px-5 py-5 text-xs text-gray-400">Could not load mentors.</p>
      ) : mentors.length === 0 ? (
        <p className="px-5 py-5 text-xs text-gray-400">
          No mentors available yet.{' '}
          <Link to="/mentors" className="text-lgu-600 hover:underline">Check the directory</Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {mentors.slice(0, 3).map(m => (
            <li key={m.id} className="px-5 py-3.5 flex items-center gap-3
                                      hover:bg-gray-50/60 transition-colors duration-100">
              {/* Avatar initial */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-lgu-50 border border-lgu-100
                              flex items-center justify-center">
                <span className="text-xs font-bold text-lgu-700">
                  {m.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                <p className="text-xs text-gray-400 truncate">{m.department}</p>
              </div>
              <Link to="/mentors"
                    className="shrink-0 text-xs font-medium text-lgu-600
                               hover:text-lgu-700 transition-colors">
                Connect →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conversations Panel
// ---------------------------------------------------------------------------
function ConversationsPanel({ conversations }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden
                    animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Recent Conversations</h2>
        <Link to="/assistant"
              className="text-xs font-medium text-lgu-600 hover:text-lgu-700
                         hover:underline transition-colors">
          New chat →
        </Link>
      </div>

      {conversations.length === 0 ? (
        /* Polished empty state */
        <div className="px-5 py-8 flex flex-col items-center text-center">
          <div className="w-11 h-11 rounded-xl bg-lgu-50 border border-lgu-100
                          flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                 strokeLinejoin="round" className="w-5 h-5 text-lgu-500">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Start your first conversation</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
            Ask about fees, scholarships, exam policies, applications, societies, and more.
          </p>
          <Link to="/assistant"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold
                           bg-lgu-700 hover:bg-lgu-600 text-white px-4 py-2 rounded-lg
                           transition-all duration-150 shadow-sm hover:shadow">
            Start chatting
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                 className="w-3.5 h-3.5">
              <path fillRule="evenodd"
                d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l-3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
                clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {conversations.map(conv => (
            <li key={conv.id}
                className="px-5 py-3.5 flex items-start justify-between gap-3
                           hover:bg-gray-50/60 transition-colors duration-100">
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
                               transition-colors mt-0.5">
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
// Top bar (inside main content area)
// ---------------------------------------------------------------------------
function TopBar({ profile, onMenuOpen }) {
  return (
    <div className="bg-white border-b border-gray-100 px-5 py-3
                    flex items-center justify-between shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        aria-label="Open navigation"
        className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100
                   hover:text-lgu-700 transition-colors mr-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
             className="w-5 h-5">
          <path fillRule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd" />
        </svg>
      </button>

      {/* Page label */}
      <p className="text-sm font-semibold text-gray-700 hidden md:block">
        Student Dashboard
      </p>

      {/* User info — right */}
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-700 leading-tight">{profile.name}</p>
          <p className="text-xs text-gray-400 leading-tight">
            Sem {profile.semester} · {profile.department}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-lgu-700 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold select-none">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------
export default function StudentDashboardPlaceholder() {
  const { token, logout } = useAuth()

  const [dashboard,   setDashboard]   = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [mentors,     setMentors]     = useState([])
  const [mentorError, setMentorError] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Parallel fetches — dashboard is required, mentors are non-fatal
    Promise.all([
      getStudentDashboard(token).then(d => setDashboard(d)).catch(err => {
        setError(err.response?.data?.detail || 'Failed to load dashboard.')
      }),
      listMentors(token).then(data => setMentors(data.mentors || [])).catch(() => {
        setMentorError(true)
      }),
    ]).finally(() => setLoading(false))
  }, [token])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={logout}
      />

      {/* ── Main column ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar — shown once profile is loaded */}
        {dashboard && (
          <TopBar
            profile={dashboard.profile}
            onMenuOpen={() => setSidebarOpen(true)}
          />
        )}
        {/* Mobile top bar while loading (still need hamburger) */}
        {!dashboard && !error && (
          <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin w-7 h-7 text-lgu-400"
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
              {/* Row 1: Welcome banner + profile card side by side on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <WelcomeBanner name={dashboard.profile.name} />
                </div>
                <div>
                  <ProfileCard profile={dashboard.profile} token={token} />
                </div>
              </div>

              {/* Stats row */}
              <StatsRow
                appCount={dashboard.recent_applications.length}
                convCount={dashboard.recent_conversations.length}
              />

              {/* Row: Applications grid + Mentors panel side by side on lg+ */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ApplicationsGrid applications={dashboard.recent_applications} />
                </div>
                <div>
                  <MentorsPanel mentors={mentors} error={mentorError} />
                </div>
              </div>

              {/* Conversations */}
              <ConversationsPanel conversations={dashboard.recent_conversations} />
            </>
          ) : null}
        </main>
      </div>
    </div>
  )
}
