/**
 * SocietiesPage — student-facing university societies browse.
 *
 * Extensions over DirectoryPage pattern:
 *   - Category filter chips (all 7 categories) narrow the visible list
 *   - Detail view shows society-specific fields: description, how_to_join,
 *     contact_email, optional social_media_link, optional faculty_advisor
 *   - Search and filter work together (search within the active category filter)
 *
 * No auth required; societies data is public.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getSociety,
  listSocieties,
  searchSocieties,
} from '../../api/societies'
import { useAuth } from '../../auth/AuthContext'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_CATEGORIES = [
  'Tech', 'Sports', 'Literary', 'Arts', 'Social Welfare', 'Cultural', 'Other',
]

// Badge colours — shared with SocietyManager
const CAT_COLOURS = {
  'Tech':          'bg-blue-50 text-blue-700 border-blue-200',
  'Sports':        'bg-green-50 text-green-700 border-green-200',
  'Literary':      'bg-amber-50 text-amber-700 border-amber-200',
  'Arts':          'bg-pink-50 text-pink-700 border-pink-200',
  'Social Welfare':'bg-teal-50 text-teal-700 border-teal-200',
  'Cultural':      'bg-purple-50 text-purple-700 border-purple-200',
  'Other':         'bg-gray-100 text-gray-600 border-gray-200',
}

// People icon SVG (re-used for society avatar)
function PeopleIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
         className={className}>
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 8 18c1.84 0 3.555-.59 4.954-1.595a1.23 1.23 0 0 0 .41-1.412 4.5 4.5 0 0 0-8.897 0Z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Category badge
// ---------------------------------------------------------------------------
function CategoryBadge({ category, large = false }) {
  const cls = CAT_COLOURS[category] || 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-block font-medium border rounded-full ${cls}
                      ${large ? 'text-xs px-2.5 py-0.5' : 'text-xs px-2 py-0.5'}`}>
      {category}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Society card (list view)
// ---------------------------------------------------------------------------
function SocietyCard({ society, onClick }) {
  return (
    <button
      onClick={() => onClick(society.id)}
      className="w-full text-left bg-white rounded-2xl border border-gray-200
                 shadow-sm hover:border-lgu-300 hover:shadow-md
                 transition-all p-5 flex items-start gap-4"
    >
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl bg-lgu-100 flex items-center justify-center mt-0.5">
        <PeopleIcon className="w-5 h-5 text-lgu-700" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-gray-800">{society.name}</p>
          <CategoryBadge category={society.category} />
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {society.description_preview}
        </p>
        <p className="text-xs text-lgu-700 mt-1">{society.contact_email}</p>
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
// Society detail view
// ---------------------------------------------------------------------------
function SocietyDetail({ society, onBack }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-lgu-700 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clipRule="evenodd" />
        </svg>
        Back to societies
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-lgu-100 flex items-center justify-center">
            <PeopleIcon className="w-6 h-6 text-lgu-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{society.name}</h1>
            <CategoryBadge category={society.category} large />
          </div>
        </div>

        {/* About */}
        <div className="flex gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">About</span>
          <p className="text-sm text-gray-800 leading-relaxed">{society.description}</p>
        </div>

        {/* How to join */}
        <div className="flex gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">How to join</span>
          <p className="text-sm text-gray-800 leading-relaxed">{society.how_to_join}</p>
        </div>

        {/* Contact */}
        <div className="flex gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Contact</span>
          <a href={`mailto:${society.contact_email}`}
             className="text-sm text-lgu-700 hover:underline break-all">
            {society.contact_email}
          </a>
        </div>

        {/* Social media (optional) */}
        {society.social_media_link && (
          <div className="flex gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Social</span>
            <a href={society.social_media_link} target="_blank" rel="noopener noreferrer"
               className="text-sm text-lgu-700 hover:underline break-all">
              {society.social_media_link}
            </a>
          </div>
        )}

        {/* Faculty advisor (optional) */}
        {society.faculty_advisor && (
          <div className="flex gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Advisor</span>
            <span className="text-sm text-gray-800">{society.faculty_advisor}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function SocietiesPage() {
  const { logout } = useAuth()

  const [view, setView]         = useState('list')      // 'list' | 'detail'
  const [allSocieties, setAll]  = useState([])          // full unfiltered list
  const [displayed, setDisplayed] = useState([])        // after category filter
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [searchQ, setSearchQ]   = useState('')
  const [searching, setSearching] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)  // null = All

  const debounceRef = useRef(null)
  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Initial full list load
  useEffect(() => {
    ;(async () => {
      try {
        const data = await listSocieties()
        setAll(data.societies)
        setDisplayed(data.societies)
      } catch {
        setError('Failed to load societies.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Apply category filter whenever activeCategory or allSocieties changes
  // (when not in search mode)
  function applyFilter(societies, category) {
    if (!category) return societies
    return societies.filter(s => s.category === category)
  }

  // Debounced search — 400 ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!searchQ.trim()) {
        // Cleared — restore filtered full list
        setDisplayed(applyFilter(allSocieties, activeCategory))
        return
      }
      setSearching(true)
      try {
        const data = await searchSocieties(searchQ.trim())
        // Apply category filter on top of search results
        setDisplayed(applyFilter(data.societies, activeCategory))
      } catch {
        setError('Search failed.')
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [searchQ, activeCategory, allSocieties])

  function handleCategoryClick(cat) {
    const next = activeCategory === cat ? null : cat
    setActiveCategory(next)
    // If no active search, apply filter directly to full list
    if (!searchQ.trim()) {
      setDisplayed(applyFilter(allSocieties, next))
    }
  }

  async function openDetail(id) {
    setDetailLoading(true)
    setView('detail')
    try {
      const society = await getSociety(id)
      setDetail(society)
    } catch {
      setError('Could not load society details.')
      setView('list')
    } finally {
      setDetailLoading(false)
    }
  }

  function backToList() { setView('list'); setDetail(null) }

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
            Societies
          </span>
        </div>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {view === 'list' ? (
          <>
            <div>
              <h1 className="text-xl font-bold text-gray-900">University Societies</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Discover clubs and societies — find one that matches your interests.
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
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                     placeholder="Search by name, description, or category…"
                     className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                                focus:outline-none focus:ring-2 focus:ring-lgu-400 bg-white" />
              {searching && (
                <svg className="animate-spin w-4 h-4 text-lgu-400 absolute right-3 top-1/2 -translate-y-1/2"
                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>

            {/* Category filter chips */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryClick(null)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors
                            ${!activeCategory
                              ? 'bg-lgu-700 text-white border-lgu-700'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-lgu-400'}`}>
                All
              </button>
              {ALL_CATEGORIES.map(cat => {
                const active = activeCategory === cat
                const colours = CAT_COLOURS[cat] || 'bg-gray-100 text-gray-600 border-gray-200'
                return (
                  <button key={cat} onClick={() => handleCategoryClick(cat)}
                          className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors
                                      ${active ? colours + ' ring-2 ring-offset-1 ring-lgu-400' : 'bg-white text-gray-600 border-gray-300 hover:border-lgu-300'}`}>
                    {cat}
                  </button>
                )
              })}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
            )}

            {/* List */}
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
            ) : displayed.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">
                {searchQ || activeCategory ? 'No societies match your filter.' : 'No societies yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {displayed.map(s => (
                  <SocietyCard key={s.id} society={s} onClick={openDetail} />
                ))}
                <p className="text-xs text-gray-400 text-center">
                  {displayed.length} societ{displayed.length !== 1 ? 'ies' : 'y'}
                  {searchQ ? ` matching "${searchQ}"` : ''}
                  {activeCategory ? ` in ${activeCategory}` : ''}
                </p>
              </div>
            )}
          </>
        ) : (
          detailLoading
            ? <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
            : detail
              ? <SocietyDetail society={detail} onBack={backToList} />
              : null
        )}
      </main>
    </div>
  )
}
