/**
 * Navbar — shared floating pill navbar for all authenticated pages.
 *
 * Reads user role and logout from AuthContext.
 * Uses NavLink for active-link highlighting.
 *
 * Student: logo + nav links (Dashboard, Assistant, Applications,
 *          Directory, Societies) + Sign out pill button.
 * Admin:   logo + "Admin" badge + Sign out pill button (no nav links).
 *
 * Mobile (< md): nav links collapse; hamburger toggles a dropdown panel.
 */
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// ---------------------------------------------------------------------------
// Nav link definitions (student only)
// ---------------------------------------------------------------------------
const STUDENT_LINKS = [
  { label: 'Dashboard',    to: '/dashboard'    },
  { label: 'Assistant',    to: '/assistant'    },
  { label: 'Applications', to: '/applications' },
  { label: 'Directory',    to: '/directory'    },
  { label: 'Societies',    to: '/societies'    },
]

// ---------------------------------------------------------------------------
// Active / inactive link class helper for NavLink
// ---------------------------------------------------------------------------
function navLinkClass({ isActive }) {
  return isActive
    ? 'text-sm font-semibold text-lgu-700 bg-lgu-50 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors'
    : 'text-sm font-medium text-gray-500 hover:text-lgu-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors'
}

// ---------------------------------------------------------------------------
// Hamburger icon
// ---------------------------------------------------------------------------
function HamburgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
         className="w-5 h-5">
      <path fillRule="evenodd"
        d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Close icon
// ---------------------------------------------------------------------------
function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
         className="w-5 h-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main Navbar component
// ---------------------------------------------------------------------------
export default function Navbar() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown on outside click/touch
  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [menuOpen])

  function handleLinkClick() {
    setMenuOpen(false)
  }

  return (
    /* Row: logo (far left) — pill (centered) — sign out (far right) */
    <div className="w-full flex items-center py-4 px-5 shrink-0 relative">

      {/* ── LGU logo — pinned far left, bare image ─────────────────── */}
      <img
        src="/lgu-logo.png"
        alt="LGU"
        className="absolute left-5 h-14 w-auto drop-shadow-sm"
      />

      {/* ── Pill — nav links only, centered ──────────────────────────── */}
      <nav className="bg-white rounded-2xl shadow-sm border border-gray-200
                      px-8 py-3 inline-flex items-center gap-1 relative mx-auto">

        {/* Admin badge */}
        {isAdmin && (
          <span className="text-xs bg-lgu-100 text-lgu-700 font-semibold
                           px-2.5 py-0.5 rounded-full hidden sm:inline-block mr-2">
            Admin
          </span>
        )}

        {/* ── Student nav links (desktop md+) ──────────────────────── */}
        {!isAdmin && (
          <div className="hidden md:flex items-center gap-1">
            {STUDENT_LINKS.map(({ label, to }) => (
              <NavLink key={to} to={to} className={navLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {/* ── Hamburger — mobile only ──────────────────────────────── */}
        {!isAdmin && (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="md:hidden p-1.5 rounded-xl text-gray-500
                       hover:bg-lgu-50 hover:text-lgu-700 transition-colors"
          >
            {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        )}

        {/* ── Mobile dropdown ───────────────────────────────────────── */}
        {menuOpen && !isAdmin && (
          <div
            ref={menuRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white
                       rounded-2xl shadow-lg border border-gray-100
                       py-2 z-50 md:hidden"
          >
            {STUDENT_LINKS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `block px-5 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'font-semibold text-lgu-700 bg-lgu-50'
                      : 'font-medium text-gray-600 hover:bg-gray-50 hover:text-lgu-700'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2 px-5 pb-1">
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="w-full text-left text-sm font-medium text-gray-500
                           hover:text-lgu-700 py-1.5 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Sign out — pinned far right ────────────────────────────── */}
      <button
        onClick={logout}
        className="absolute right-5 bg-lgu-700 hover:bg-lgu-600 text-white
                   text-sm font-medium rounded-xl px-5 py-2.5 transition-all
                   whitespace-nowrap shadow-sm hover:shadow-md shrink-0"
      >
        Sign out
      </button>

    </div>
  )
}
