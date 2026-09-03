/**
 * Student Dashboard — Stage 7 + Stage 13 mentor toggle.
 * UI polish pass: cleaner hierarchy, lighter profile card, polished empty states.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getStudentDashboard, updateStudentProfile } from '../api/students'
import Navbar from '../components/Navbar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
  const done = status === 'downloaded'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full
                      ${done ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-lgu-50 text-lgu-700 border border-lgu-100'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-lgu-500'}`} />
      {done ? 'Downloaded' : 'Generated'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Profile Card
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
    <div className="animate-fade-in-up rounded-2xl overflow-hidden
                    shadow-sm border border-lgu-200/60
                    hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
         style={{ background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 60%, #144D18 100%)' }}>
      <div className="p-6 sm:p-7">

        {/* ── Top row: avatar · name/email · crest ────────────────── */}
        <div className="flex items-start gap-4">
          {/* Avatar initial */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 border border-white/10
                          flex items-center justify-center shrink-0">
            <span className="text-white text-xl font-bold select-none leading-none">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug truncate">
              {profile.name}
            </h2>
            <p className="text-sm text-white/60 truncate mt-0.5">{profile.email}</p>
          </div>

          {/* LGU crest */}
          <div className="shrink-0 mt-0.5 bg-white/10 rounded-xl p-1.5 border border-white/10">
            <img src="/lgu-logo.png" alt="LGU" className="h-8 w-8 object-contain opacity-90" />
          </div>
        </div>

        {/* ── Info chips ──────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Dept',     value: profile.department },
            { label: 'Semester', value: `Sem ${profile.semester}` },
            { label: 'Batch',    value: profile.batch      },
          ].map(({ label, value }) => (
            <span key={label}
                  className="text-xs rounded-lg px-2.5 py-1 bg-white/10
                             border border-white/10 text-white/90">
              <span className="text-white/50 mr-1">{label}</span>
              <span className="font-semibold">{value}</span>
            </span>
          ))}
        </div>

        {/* ── Mentor toggle ───────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-white/10
                        flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-snug">
              Available as mentor
            </p>
            <p className="text-xs text-white/50 mt-0.5">
              {isMentor ? 'Listed in the Mentors directory.' : 'Help junior students find guidance.'}
            </p>
            {toggleError && <p className="text-xs text-red-300 mt-1">{toggleError}</p>}
          </div>

          {/* Toggle switch */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            aria-pressed={isMentor}
            aria-label="Toggle mentor availability"
            style={{ height: '1.625rem' }}
            className={`relative shrink-0 w-12 rounded-full transition-all duration-300
                        focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2
                        focus:ring-offset-lgu-700 disabled:opacity-50 cursor-pointer
                        ${isMentor ? 'bg-white/80' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow
                              transition-all duration-300
                              ${isMentor ? 'translate-x-6 bg-lgu-600' : 'translate-x-0 bg-white/70'}`} />
          </button>
        </div>

        {/* ── Member since ─────────────────────────────────────────── */}
        <p className="mt-4 text-xs text-white/40">
          Member since {formatDate(profile.created_at)}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick-access tiles
// ---------------------------------------------------------------------------
const NAV_TILES = [
  {
    label: 'Assistant',    sub: 'Ask anything about university',    to: '/assistant',
    icon: '✦',  accent: true,
  },
  {
    label: 'Applications', sub: 'Generate letters & forms',          to: '/applications',
    icon: '✉',  accent: false,
  },
  {
    label: 'Directory',    sub: 'Offices, departments & contacts',  to: '/directory',
    icon: '⊞',  accent: false,
  },
  {
    label: 'Societies',    sub: 'Clubs, sports, arts & more',       to: '/societies',
    icon: '◈',  accent: false,
  },
  {
    label: 'Mentors',      sub: 'Connect with senior students',      to: '/mentors',
    icon: '◎',  accent: false,
  },
]

function QuickAccess() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
                    animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

      {/* Section header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Quick Access
        </h3>
      </div>

      <div className="divide-y divide-gray-50">
        {NAV_TILES.map(({ label, sub, to, icon, accent }, idx) => (
          <Link
            key={label}
            to={to}
            className="group flex items-center gap-4 px-5 py-3.5
                       hover:bg-gray-50/80 transition-all duration-150
                       animate-fade-in-up"
            style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
          >
            {/* Icon container */}
            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                             text-base font-bold transition-transform duration-150
                             group-hover:scale-105
                             ${accent
                               ? 'bg-lgu-700 text-white shadow-sm'
                               : 'bg-gray-100 text-gray-500 group-hover:bg-lgu-50 group-hover:text-lgu-600'}`}>
              {icon}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-snug transition-colors
                             ${accent
                               ? 'text-lgu-700'
                               : 'text-gray-800 group-hover:text-lgu-700'}`}>
                {label}
                {accent && (
                  <span className="ml-2 text-xs font-medium text-lgu-500 bg-lgu-50
                                   px-1.5 py-0.5 rounded-md">AI</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
            </div>

            {/* Arrow */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                 className="w-4 h-4 shrink-0 text-gray-300
                            group-hover:text-lgu-400 group-hover:translate-x-0.5
                            transition-all duration-150">
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
                    animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Recent Applications</h3>
          <p className="text-xs text-gray-400 mt-0.5">Your generated documents</p>
        </div>
        <Link to="/applications"
              className="inline-flex items-center gap-1 text-xs font-semibold text-white
                         bg-lgu-700 hover:bg-lgu-600 px-3 py-1.5 rounded-lg
                         transition-all duration-150 shadow-sm hover:shadow whitespace-nowrap">
          + New
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-500">No applications yet.</p>
          <Link to="/applications"
                className="mt-2 inline-flex text-xs font-medium text-lgu-600 hover:underline">
            Generate your first one →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {applications.map(app => (
            <li key={app.id}
                className="px-5 py-3.5 flex items-center justify-between gap-3
                           hover:bg-gray-50/60 transition-colors duration-100">
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
                    animate-fade-in-up" style={{ animationDelay: '0.52s' }}>
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Recent Conversations</h3>
          <p className="text-xs text-gray-400 mt-0.5">Your AI chat history</p>
        </div>
        <Link to="/assistant"
              className="text-xs font-medium text-lgu-600 hover:text-lgu-700
                         hover:underline transition-colors whitespace-nowrap">
          New chat →
        </Link>
      </div>

      {conversations.length === 0 ? (
        /* ── Polished empty state ─────────────────────────────────── */
        <div className="px-5 py-10 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-lgu-50 border border-lgu-100
                          flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                 strokeLinejoin="round" className="w-6 h-6 text-lgu-500">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-gray-800">Start your first conversation</h4>
          <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
            Ask CampusFlow AI about fees, scholarships, exam policies,
            applications, societies, and more.
          </p>
          <Link to="/assistant"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold
                           bg-lgu-700 hover:bg-lgu-600 text-white px-4 py-2 rounded-lg
                           transition-all duration-150 shadow-sm hover:shadow">
            Start chatting
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                 className="w-3.5 h-3.5">
              <path fillRule="evenodd"
                d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
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
    <div className="min-h-screen bg-gray-50/80">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-3">
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
