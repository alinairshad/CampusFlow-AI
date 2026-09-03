/**
 * Navbar — shared app-wide header for all authenticated pages.
 *
 * Layout: CampusFlow AI (left) | nav links (center, desktop) | Sign out (right)
 * Mobile: hamburger collapses nav links into a dropdown.
 */
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const STUDENT_LINKS = [
  { label: 'Dashboard',    to: '/dashboard'    },
  { label: 'Assistant',    to: '/assistant'    },
  { label: 'Applications', to: '/applications' },
  { label: 'Directory',    to: '/directory'    },
  { label: 'Societies',    to: '/societies'    },
]

function navLinkClass({ isActive }) {
  return isActive
    ? 'text-sm font-semibold text-lgu-700 bg-lgu-50 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-150'
    : 'text-sm font-medium text-gray-500 hover:text-lgu-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-150'
}

function HamburgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd"
        d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [menuOpen])

  return (
    <header className="w-full bg-white border-b border-gray-100 shrink-0">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

        {/* ── Branding ─────────────────────────────────────────────── */}
        <span className="text-base font-bold text-lgu-700 whitespace-nowrap shrink-0 tracking-tight">
          CampusFlow AI
        </span>

        {/* ── Nav links (desktop) ──────────────────────────────────── */}
        {!isAdmin && (
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {STUDENT_LINKS.map(({ label, to }) => (
              <NavLink key={to} to={to} className={navLinkClass}>
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        {isAdmin && (
          <span className="hidden sm:inline-flex text-xs bg-lgu-50 text-lgu-700 font-semibold
                           px-2.5 py-1 rounded-lg border border-lgu-100">
            Admin Panel
          </span>
        )}

        {/* ── Right: sign out + mobile hamburger ───────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={logout}
            className="bg-lgu-700 hover:bg-lgu-600 active:bg-lgu-800 text-white
                       text-xs font-semibold rounded-lg px-4 py-2 transition-all duration-150
                       whitespace-nowrap shadow-sm hover:shadow"
          >
            Sign out
          </button>

          {!isAdmin && (
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="md:hidden p-1.5 rounded-lg text-gray-500
                         hover:bg-gray-100 hover:text-lgu-700 transition-colors"
            >
              {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────────────── */}
      {menuOpen && !isAdmin && (
        <div ref={menuRef}
             className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-0.5">
          {STUDENT_LINKS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'font-semibold text-lgu-700 bg-lgu-50'
                    : 'font-medium text-gray-600 hover:bg-gray-50 hover:text-lgu-700'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}
