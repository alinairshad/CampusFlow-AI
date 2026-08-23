/**
 * StatsWidget — 2×2 grid of stat cards for the admin dashboard.
 *
 * Props:
 *   token : string — admin JWT
 */
import { useEffect, useState } from 'react'
import { getAdminStats } from '../../api/admin'

// ---------------------------------------------------------------------------
// Individual stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value, icon, colour, loading }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5
                     flex items-center gap-4`}>
      {/* Icon circle */}
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colour}`}>
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 leading-none mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-12 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 leading-none">
            {value?.toLocaleString() ?? '—'}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SVG icons (inline, no icon library)
// ---------------------------------------------------------------------------
const DocIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
       className="w-5 h-5">
    <path fillRule="evenodd"
      d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5ZM10 8a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 10 8Z"
      clipRule="evenodd" />
  </svg>
)

const StudentsIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
       className="w-5 h-5">
    <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
  </svg>
)

const ChatIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
       className="w-5 h-5">
    <path fillRule="evenodd"
      d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      clipRule="evenodd" />
  </svg>
)

const DirectoryIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
       className="w-5 h-5">
    <path fillRule="evenodd"
      d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v13.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75H3a.75.75 0 0 1-.75-.75V15h-.5A.75.75 0 0 1 1 14.25v-1.5a.75.75 0 0 1 .75-.75H2V3.5h-.25A.75.75 0 0 1 1 2.75ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM8 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM8.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM14.25 6a.75.75 0 0 0-.75.75V17a1 1 0 0 0 1 1h3.75a.75.75 0 0 0 .75-.75v-7a.75.75 0 0 0-.75-.75h-2.25V6.75a.75.75 0 0 0-.75-.75h-1Zm.5 9.5v-1h1v1h-1Zm0-2.5v-1h1v1h-1Zm2.5 2.5v-1h1v1h-1Zm0-2.5v-1h1v1h-1Z"
      clipRule="evenodd" />
  </svg>
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const STAT_CARDS = [
  {
    key:    'total_documents',
    label:  'Documents indexed',
    icon:   DocIcon,
    colour: 'bg-indigo-100 text-indigo-600',
  },
  {
    key:    'total_students',
    label:  'Registered students',
    icon:   StudentsIcon,
    colour: 'bg-green-100 text-green-600',
  },
  {
    key:    'total_queries',
    label:  'Queries handled',
    icon:   ChatIcon,
    colour: 'bg-purple-100 text-purple-600',
  },
  {
    key:    'total_directory_entries',
    label:  'Directory entries',
    icon:   DirectoryIcon,
    colour: 'bg-amber-100 text-amber-600',
  },
]

export default function StatsWidget({ token }) {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getAdminStats(token)
        setStats(data)
      } catch (err) {
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'Failed to load stats.')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
        {error}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {STAT_CARDS.map(({ key, label, icon, colour }) => (
        <StatCard
          key={key}
          label={label}
          value={stats?.[key]}
          icon={icon}
          colour={colour}
          loading={loading}
        />
      ))}
    </div>
  )
}
