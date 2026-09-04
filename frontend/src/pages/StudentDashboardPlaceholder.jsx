/**
 * Student Dashboard — Stage 7 + Stage 13 + Stage 17 + visual polish.
 *
 * Layout: DashboardSidebar (left) + scrollable main column (right).
 * All API calls, routes, and auth logic unchanged.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getStudentDashboard, updateStudentProfile } from '../api/students'
import { listMentors } from '../api/mentors'
import DashboardSidebar from '../features/dashboard/DashboardSidebar'

// ---------------------------------------------------------------------------
// Helpers (unchanged)
// ---------------------------------------------------------------------------
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function todayLong() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)  return `${days}d ago`
  return formatDate(iso)
}

function StatusBadge({ status }) {
  const done = status === 'downloaded'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
      ${done ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-lgu-50 text-lgu-700 border border-lgu-100'}`}>
      <span className={`w-1 h-1 rounded-full ${done ? 'bg-emerald-500' : 'bg-lgu-500'}`} />
      {done ? 'Downloaded' : 'Generated'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Top Bar
// ---------------------------------------------------------------------------
function TopBar({ profile, onMenuOpen }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-5 h-14
                    flex items-center justify-between shrink-0">
      <button onClick={onMenuOpen} aria-label="Open navigation"
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors mr-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </button>

      <p className="text-sm font-semibold text-gray-600 hidden md:block tracking-tight">
        Student Dashboard
      </p>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-gray-800 leading-tight">{profile.name}</p>
          <p className="text-xs text-gray-400 leading-tight mt-0.5">
            Semester {profile.semester} · {profile.department}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lgu-600 to-lgu-800
                        flex items-center justify-center shrink-0 ring-2 ring-lgu-100">
          <span className="text-white text-xs font-bold select-none">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Welcome Banner
// ---------------------------------------------------------------------------
function WelcomeBanner({ name }) {
  return (
    <div className="relative overflow-hidden rounded-2xl px-7 py-6 text-white shadow-sm animate-fade-in-up"
         style={{ background: 'linear-gradient(125deg, #2E7D32 0%, #1B5E20 55%, #144D18 100%)' }}>
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04]"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative">
        <p className="text-xs font-medium text-white/50 mb-2 tracking-wide">{todayLong()}</p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight">Welcome back, {name}!</h1>
        <p className="text-sm text-white/65 mt-1.5">Your university companion is ready to help.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats Row — only real data from the dashboard response
// ---------------------------------------------------------------------------
function StatsRow({ appCount, convCount }) {
  const stats = [
    {
      label: 'Applications',
      value: appCount,
      sub: 'documents generated',
      color: 'bg-lgu-50 text-lgu-600 border-lgu-100',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: 'Conversations',
      value: convCount,
      sub: 'AI chat sessions',
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
      ),
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
      {stats.map(({ label, value, sub, icon, color }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5
                                    flex items-center gap-3 hover:shadow-md hover:-translate-y-px
                                    transition-all duration-150">
          <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-800 leading-none">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile Card
// ---------------------------------------------------------------------------
function ProfileCard({ profile, token, onMentorToggled }) {
  const [isMentor, setIsMentor]   = useState(profile.is_mentor ?? false)
  const [toggling, setToggling]   = useState(false)
  const [toggleError, setToggleError] = useState('')

  async function handleToggle() {
    setToggling(true)
    setToggleError('')
    const next = !isMentor
    try {
      const updated = await updateStudentProfile({ is_mentor: next }, token)
      setIsMentor(updated.is_mentor)
      // Refresh the seniors list so it immediately reflects the change
      if (onMentorToggled) onMentorToggled()
    } catch (err) {
      setToggleError(err.response?.data?.detail ?? 'Update failed.')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-full
                    animate-fade-in-up" style={{ animationDelay: '0.04s' }}>
      {/* Green accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-lgu-600 to-lgu-400" />

      <div className="p-4">
        {/* Avatar + name + logo row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-lgu-600 to-lgu-800
                          flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold select-none">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{profile.name}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{profile.email}</p>
          </div>
          <img src="/lgu-logo.png" alt="LGU" className="shrink-0 h-7 w-7 object-contain opacity-50" />
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[
            { label: 'Dept', value: profile.department },
            { label: 'Sem',  value: profile.semester   },
            { label: 'Batch', value: profile.batch     },
          ].map(({ label, value }) => (
            <span key={label} className="text-xs rounded-md px-2 py-0.5 bg-gray-50 border border-gray-100">
              <span className="text-gray-400">{label} </span>
              <span className="font-semibold text-gray-700">{value}</span>
            </span>
          ))}
        </div>

        {/* Mentor toggle */}
        <div className="pt-3 border-t border-gray-50 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 leading-tight">Senior</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">
              {isMentor ? 'Visible in directory' : 'Help juniors'}
            </p>
            {toggleError && <p className="text-xs text-red-500 mt-1">{toggleError}</p>}
          </div>
          <button onClick={handleToggle} disabled={toggling} aria-pressed={isMentor}
                  aria-label="Toggle senior availability"
                  style={{ height: '1.375rem' }}
                  className={`relative shrink-0 w-10 rounded-full transition-all duration-300 cursor-pointer
                              focus:outline-none focus:ring-2 focus:ring-lgu-300 focus:ring-offset-1
                              disabled:opacity-50 ${isMentor ? 'bg-lgu-600' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow
                              transition-all duration-300 ${isMentor ? 'translate-x-[1.375rem]' : 'translate-x-0'}`}
                  style={{ width: '1.125rem', height: '1.125rem' }} />
          </button>
        </div>

        <p className="mt-2.5 text-xs text-gray-300 leading-none">
          Member since {formatDate(profile.created_at)}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------
const QUICK_ACTIONS = [
  {
    label: 'Ask CampusFlow AI',
    sub: 'Get instant answers',
    to: '/assistant',
    primary: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'New Application',
    sub: 'Generate a document',
    to: '/applications',
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
      </svg>
    ),
  },
  {
    label: 'Directory',
    sub: 'Find offices & contacts',
    to: '/directory',
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v13.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75H3a.75.75 0 0 1-.75-.75V15h-.5A.75.75 0 0 1 1 14.25v-1.5a.75.75 0 0 1 .75-.75H2V3.5h-.25A.75.75 0 0 1 1 2.75Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Societies',
    sub: 'Clubs & activities',
    to: '/societies',
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
      </svg>
    ),
  },
  {
    label: 'Find a Senior',
    sub: 'Peer guidance',
    to: '/mentors',
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 15a4 4 0 0 0-8 0v3h8v-3Z" />
      </svg>
    ),
  },
]

function QuickActions() {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '0.14s' }}>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {QUICK_ACTIONS.map(({ label, sub, to, primary, icon }) => (
          <Link key={to} to={to}
                className={`flex flex-col items-center text-center gap-2 px-3 py-3.5 rounded-xl
                            border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md
                            group
                            ${primary
                              ? 'bg-lgu-700 border-lgu-600 text-white hover:bg-lgu-600 shadow-sm col-span-2 sm:col-span-1'
                              : 'bg-white border-gray-100 shadow-sm hover:border-lgu-200'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                             ${primary
                               ? 'bg-white/20 text-white'
                               : 'bg-gray-50 text-gray-500 group-hover:bg-lgu-50 group-hover:text-lgu-600'}`}>
              {icon}
            </div>
            <div>
              <p className={`text-xs font-semibold leading-tight
                             ${primary ? 'text-white' : 'text-gray-800'}`}>
                {label}
              </p>
              <p className={`text-xs mt-0.5 leading-tight hidden sm:block
                             ${primary ? 'text-white/70' : 'text-gray-400'}`}>
                {sub}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Applications Grid
// ---------------------------------------------------------------------------
function ApplicationsGrid({ applications }) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '0.20s' }}>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Recent Applications
        </h2>
        <Link to="/applications"
              className="text-xs font-semibold text-white bg-lgu-700 hover:bg-lgu-600
                         px-2.5 py-1 rounded-lg transition-all duration-150 shadow-sm">
          + New
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-7 text-center">
          <p className="text-sm text-gray-500">No applications yet.</p>
          <Link to="/applications" className="mt-1.5 inline-flex text-xs font-medium text-lgu-600 hover:underline">
            Generate your first one →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {applications.map(app => (
            <div key={app.id}
                 className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3
                            flex items-center gap-3 hover:shadow-md hover:border-gray-200
                            transition-all duration-150">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{app.type_label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(app.created_at)}</p>
              </div>
              <StatusBadge status={app.status} />
              <Link to="/applications"
                    className="shrink-0 flex items-center gap-0.5 text-xs font-semibold
                               text-lgu-700 hover:text-lgu-600 transition-colors ml-1">
                View
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
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
                    animate-fade-in-up" style={{ animationDelay: '0.24s' }}>
      <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seniors</h2>
        <Link to="/mentors" className="text-xs font-medium text-lgu-600 hover:text-lgu-700 hover:underline transition-colors">
          See all →
        </Link>
      </div>
      {error ? (
        <p className="px-4 py-5 text-xs text-gray-400">Could not load seniors.</p>
      ) : mentors.length === 0 ? (
        <div className="px-4 py-5">
          <p className="text-xs text-gray-400">No seniors available yet.</p>
          <Link to="/mentors" className="text-xs text-lgu-600 hover:underline">Check the directory</Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {mentors.slice(0, 3).map(m => (
            <li key={m.id}
                className="px-4 py-3 flex items-center gap-2.5 hover:bg-gray-50/70 transition-colors duration-100">
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-lgu-50 to-lgu-100
                              border border-lgu-100 flex items-center justify-center">
                <span className="text-xs font-bold text-lgu-700">{m.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{m.name}</p>
                <p className="text-xs text-gray-400 truncate leading-tight">{m.department}</p>
              </div>
              <Link to="/mentors"
                    className="shrink-0 text-xs font-medium text-lgu-600 hover:text-lgu-700
                               transition-colors whitespace-nowrap">
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
                    animate-fade-in-up" style={{ animationDelay: '0.30s' }}>
      <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Conversations</h2>
        <Link to="/assistant" className="text-xs font-medium text-lgu-600 hover:text-lgu-700 hover:underline transition-colors">
          New chat →
        </Link>
      </div>
      {conversations.length === 0 ? (
        <div className="px-5 py-8 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-lgu-50 border border-lgu-100 flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                 className="w-5 h-5 text-lgu-500">
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l-3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {conversations.map(conv => (
            <li key={conv.id}
                className="px-4 py-3 flex items-start justify-between gap-3
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
                    className="shrink-0 text-xs font-medium text-lgu-600 hover:text-lgu-700
                               hover:underline whitespace-nowrap transition-colors mt-0.5">
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
// Page root — layout and data fetching unchanged
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
    Promise.all([
      getStudentDashboard(token).then(d => setDashboard(d)).catch(err => {
        setError(err.response?.data?.detail || 'Failed to load dashboard.')
      }),
      listMentors(token).then(data => setMentors(data.mentors || [])).catch(() => {
        setMentorError(true)
      }),
    ]).finally(() => setLoading(false))
  }, [token])

  // Re-fetch only the seniors list (called after toggle change)
  async function refreshMentors() {
    try {
      const data = await listMentors(token)
      setMentors(data.mentors || [])
      setMentorError(false)
    } catch {
      setMentorError(true)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50/80 overflow-hidden">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onSignOut={logout} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {dashboard && <TopBar profile={dashboard.profile} onMenuOpen={() => setSidebarOpen(true)} />}
        {!dashboard && !error && (
          <div className="bg-white border-b border-gray-100 px-5 h-14 flex items-center md:hidden">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation"
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin w-7 h-7 text-lgu-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          ) : dashboard ? (
            <>
              {/* 1. Welcome + Profile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <WelcomeBanner name={dashboard.profile.name} />
                </div>
                <ProfileCard profile={dashboard.profile} token={token} onMentorToggled={refreshMentors} />
              </div>

              {/* 2. Stats */}
              <StatsRow
                appCount={dashboard.recent_applications.length}
                convCount={dashboard.recent_conversations.length}
              />

              {/* 3. Quick Actions */}
              <QuickActions />

              {/* 4. Applications + Mentors */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ApplicationsGrid applications={dashboard.recent_applications} />
                </div>
                <MentorsPanel mentors={mentors} error={mentorError} />
              </div>

              {/* 5. Conversations */}
              <ConversationsPanel conversations={dashboard.recent_conversations} />
            </>
          ) : null}
        </main>
      </div>
    </div>
  )
}
