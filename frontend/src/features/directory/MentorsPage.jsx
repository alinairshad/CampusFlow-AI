/**
 * MentorsPage — student-facing Senior/Junior Mentorship Directory.
 *
 * Features:
 *   - Department filter dropdown (built from unique departments in the list)
 *   - Debounced keyword search bar (400 ms) — name + interests
 *   - Mentor cards: name, department, semester, batch, interests chips,
 *     contact email (mailto: link for direct outreach)
 *   - No detail click-through needed — all info is on the card
 *
 * Auth: requires a valid student JWT (auth-gated, not public).
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { listMentors, searchMentors } from '../../api/mentors'

// ---------------------------------------------------------------------------
// Interest chip
// ---------------------------------------------------------------------------
function InterestChip({ label }) {
  return (
    <span className="inline-block text-xs bg-lgu-50 text-lgu-700 border border-lgu-200
                     rounded-full px-2.5 py-0.5 font-medium">
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Mentor card
// ---------------------------------------------------------------------------
function MentorCard({ mentor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
      {/* Header: avatar + name + dept */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-lgu-100 flex items-center justify-center">
          <span className="text-lgu-700 text-sm font-bold">
            {mentor.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{mentor.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{mentor.department}</p>
        </div>
      </div>

      {/* Semester + batch pills */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-600">
          Sem {mentor.semester}
        </span>
        <span className="text-xs bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-600">
          Batch {mentor.batch}
        </span>
      </div>

      {/* Interests */}
      {mentor.interests && mentor.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentor.interests.map((interest, i) => (
            <InterestChip key={i} label={interest} />
          ))}
        </div>
      )}

      {/* Contact email — direct outreach, no in-app messaging */}
      <a href={`mailto:${mentor.contact_email}`}
         className="flex items-center gap-1.5 text-xs text-lgu-700 hover:underline break-all mt-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
             className="w-3.5 h-3.5 shrink-0">
          <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
          <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
        </svg>
        {mentor.contact_email}
      </a>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function MentorsPage() {
  const { token, logout } = useAuth()

  const [allMentors, setAllMentors] = useState([])     // full list (no filters)
  const [displayed, setDisplayed]  = useState([])      // after filters
  const [loading, setLoading]      = useState(true)
  const [error, setError]          = useState('')

  const [searchQ, setSearchQ]      = useState('')
  const [department, setDepartment] = useState('')     // selected dept filter
  const [searching, setSearching]  = useState(false)
  const debounceRef                = useRef(null)

  // Derive unique departments from the full list for the dropdown
  const departments = [...new Set(allMentors.map(m => m.department))].sort()

  // Initial full list load
  useEffect(() => {
    ;(async () => {
      try {
        const data = await listMentors(token)
        setAllMentors(data.mentors)
        setDisplayed(data.mentors)
      } catch (err) {
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'Failed to load mentors.')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  // Debounced search + department filter
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const q = searchQ.trim()
      const dept = department

      if (!q && !dept) {
        // No filters — restore full list
        setDisplayed(allMentors)
        return
      }

      setSearching(true)
      try {
        const data = await searchMentors(q, dept, token)
        setDisplayed(data.mentors)
      } catch (err) {
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'Search failed.')
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [searchQ, department, allMentors, token])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd" />
            </svg>
          </Link>
          <img src="/lgu-logo.png" alt="LGU" className="h-8 w-auto" />
          <span className="text-base font-bold text-lgu-700">LGU AI Assistant</span>
          <span className="text-xs bg-lgu-50 text-lgu-700 px-2 py-0.5 rounded-full font-medium">
            Mentors
          </span>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors">
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mentor Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Find senior students available for peer guidance. Contact them directly via email.
          </p>
        </div>

        {/* Filters row */}
        <div className="flex gap-3 flex-col sm:flex-row">
          {/* Department dropdown */}
          <select
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="sm:w-52 shrink-0 border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-lgu-400 bg-white"
          >
            <option value="">All departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Keyword search */}
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <path fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search by name or interest…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-lgu-400 bg-white"
            />
            {searching && (
              <svg className="animate-spin w-4 h-4 text-lgu-400 absolute right-3 top-1/2 -translate-y-1/2"
                   xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}

        {/* Results */}
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm text-gray-400">
              {searchQ || department
                ? 'No mentors match your filters.'
                : 'No mentors available yet.'}
            </p>
            {!searchQ && !department && (
              <p className="text-xs text-gray-400">
                Senior students can enable mentor availability from their{' '}
                <Link to="/dashboard" className="text-lgu-700 hover:underline">dashboard</Link>.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Results count */}
            <p className="text-xs text-gray-400">
              {displayed.length} mentor{displayed.length !== 1 ? 's' : ''}
              {department ? ` in ${department}` : ''}
              {searchQ ? ` matching "${searchQ}"` : ''}
            </p>
            {/* Cards grid — single column on mobile, 2 columns on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayed.map(m => (
                <MentorCard key={m.user_id} mentor={m} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
