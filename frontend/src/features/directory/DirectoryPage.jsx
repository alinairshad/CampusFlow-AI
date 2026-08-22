/**
 * DirectoryPage — student-facing university directory.
 *
 * States:
 *   list   → browsable entry cards
 *   detail → full entry view (back button to list)
 *
 * Search bar is debounced (400 ms) — empty search shows the full list.
 * No auth required; the directory is public.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getDirectoryEntry,
  listDirectoryEntries,
  searchDirectoryEntries,
} from '../../api/directory'
import { useAuth } from '../../auth/AuthContext'

// ---------------------------------------------------------------------------
// Category badge colours  (mirrors admin DirectoryManager)
// ---------------------------------------------------------------------------
const CAT_COLOURS = {
  Finance:         'bg-yellow-50 text-yellow-700',
  Academic:        'bg-blue-50 text-blue-700',
  Registrar:       'bg-purple-50 text-purple-700',
  'Student Services': 'bg-green-50 text-green-700',
  'IT Support':    'bg-cyan-50 text-cyan-700',
  Admin:           'bg-gray-100 text-gray-700',
}
function CategoryBadge({ category }) {
  if (!category) return null
  const cls = CAT_COLOURS[category] || 'bg-indigo-50 text-indigo-700'
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {category}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Entry card (list view)
// ---------------------------------------------------------------------------
function EntryCard({ entry, onClick }) {
  return (
    <button
      onClick={() => onClick(entry.id)}
      className="w-full text-left bg-white rounded-2xl border border-gray-200
                 shadow-sm hover:border-indigo-300 hover:shadow-md
                 transition-all p-5 flex items-start gap-4"
    >
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100
                      flex items-center justify-center mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
             className="w-5 h-5 text-indigo-600">
          <path fillRule="evenodd"
            d="M1 2.5A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5v5.5h1.5A1.5 1.5 0 0 1 14 9.5V14h.5a.5.5 0 0 1 0 1H1.5a.5.5 0 0 1 0-1H2V2.5ZM3 14h2v-2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V14h2V2.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5V14Zm5 0v-2H8v2h0Z"
            clipRule="evenodd" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-gray-800">{entry.name}</p>
          <CategoryBadge category={entry.category} />
        </div>
        <p className="text-xs text-gray-500 truncate">{entry.location}</p>
        <p className="text-xs text-gray-400 mt-0.5">{entry.working_hours}</p>
        <p className="text-xs text-indigo-600 mt-1 truncate">{entry.service_summary}</p>
      </div>

      {/* Arrow */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
           className="w-4 h-4 text-gray-400 shrink-0 mt-1">
        <path fillRule="evenodd"
          d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd" />
      </svg>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------
function EntryDetail({ entry, onBack }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-500
                         hover:text-indigo-600 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
             className="w-4 h-4">
          <path fillRule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clipRule="evenodd" />
        </svg>
        Back to directory
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-100
                          flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                 className="w-6 h-6 text-indigo-600">
              <path fillRule="evenodd"
                d="M1 2.5A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5v5.5h1.5A1.5 1.5 0 0 1 14 9.5V14h.5a.5.5 0 0 1 0 1H1.5a.5.5 0 0 1 0-1H2V2.5ZM3 14h2v-2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V14h2V2.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5V14Zm5 0v-2H8v2h0Z"
                clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{entry.name}</h1>
            <CategoryBadge category={entry.category} />
          </div>
        </div>

        {/* Detail rows */}
        {[
          { label: 'Location',       value: entry.location },
          { label: 'Working hours',  value: entry.working_hours },
          { label: 'Contact',        value: entry.contact },
        ].map(({ label, value }) => (
          <div key={label} className="flex gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">
              {label}
            </span>
            <span className="text-sm text-gray-800 leading-relaxed">{value}</span>
          </div>
        ))}

        {/* Services */}
        <div className="flex gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">
            Services
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(entry.services || []).map((svc, i) => (
              <span key={i}
                    className="inline-block text-xs bg-indigo-50 text-indigo-700
                               px-2.5 py-0.5 rounded-full">
                {svc}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        {entry.description && (
          <div className="flex gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">
              About
            </span>
            <p className="text-sm text-gray-600 leading-relaxed">{entry.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DirectoryPage() {
  const { logout } = useAuth()

  const [view, setView]         = useState('list')    // 'list' | 'detail'
  const [entries, setEntries]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [searchQ, setSearchQ]   = useState('')
  const [searching, setSearching] = useState(false)
  const debounceRef             = useRef(null)

  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Initial full list load
  useEffect(() => {
    ;(async () => {
      try {
        const data = await listDirectoryEntries()
        setEntries(data.entries)
      } catch {
        setError('Failed to load directory.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Debounced search — fires 400 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!searchQ.trim()) {
        // Empty — reload full list
        setSearching(true)
        try {
          const data = await listDirectoryEntries()
          setEntries(data.entries)
        } catch {
          setError('Search failed.')
        } finally {
          setSearching(false)
        }
        return
      }
      setSearching(true)
      try {
        const data = await searchDirectoryEntries(searchQ.trim())
        setEntries(data.entries)
      } catch {
        setError('Search failed.')
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [searchQ])

  async function openDetail(id) {
    setDetailLoading(true)
    setView('detail')
    try {
      const entry = await getDirectoryEntry(id)
      setDetail(entry)
    } catch {
      setError('Could not load entry details.')
      setView('list')
    } finally {
      setDetailLoading(false)
    }
  }

  function backToList() {
    setView('list')
    setDetail(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard"
                className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                 className="w-5 h-5">
              <path fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd" />
            </svg>
          </Link>
          <span className="text-base font-bold text-indigo-600">CampusFlow AI</span>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            Directory
          </span>
        </div>
        <button onClick={logout}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors">
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {view === 'list' ? (
          <>
            <div>
              <h1 className="text-xl font-bold text-gray-900">University Directory</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Find departments, offices, and their contact details.
              </p>
            </div>

            {/* Search bar */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                   className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <path fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                  clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search by name, service, or description…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
              {searching && (
                <svg className="animate-spin w-4 h-4 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2"
                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {/* List */}
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">
                {searchQ ? 'No results found.' : 'No directory entries yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {entries.map((e) => (
                  <EntryCard key={e.id} entry={e} onClick={openDetail} />
                ))}
                <p className="text-xs text-gray-400 text-center">
                  {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
                  {searchQ ? ` matching "${searchQ}"` : ''}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Detail view */
          detailLoading ? (
            <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
          ) : detail ? (
            <EntryDetail entry={detail} onBack={backToList} />
          ) : null
        )}
      </main>
    </div>
  )
}
