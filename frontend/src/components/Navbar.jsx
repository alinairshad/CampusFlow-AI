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
    ? 'text-xs font-bold text-lgu-700 underline underline-offset-4 decoration-lgu-700 whitespace-nowrap'
    : 'text-xs font-bold text-lgu-900/60 hover:text-lgu-700 transition-colors whitespace-nowrap'
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
    /* Outer wrapper: full-width, pill centered, sign-out pinned to far right */
    <div className="w-full flex items-center pt-4 pb-0 px-4 shrink-0 relative">

      {/* ── Pill — centered in the row ───────────────────────────────── */}
      <nav className="bg-lgu-100 rounded-full shadow-md px-8 py-3
                      inline-flex items-center gap-8 relative mx-auto">

        {/* ── Left: logo only ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          <img src="/lgu-logo.png" alt="LGU" className="h-14 w-auto" />
          {isAdmin && (
            <span className="text-xs bg-lgu-200 text-lgu-800 font-semibold
                             px-2 py-0.5 rounded-full hidden sm:inline-block">
              Admin
            </span>
          )}
        </div>

        {/* ── Center: student nav links (desktop md+) ──────────────── */}
        {!isAdmin && (
          <div className="hidden md:flex items-center gap-6">
            {STUDENT_LINKS.map(({ label, to }) => (
              <NavLink key={to} to={to} className={navLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {/* ── Hamburger — student only, mobile only ────────────────── */}
        {!isAdmin && (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="md:hidden p-1 rounded-full text-lgu-700/70
                       hover:bg-lgu-200 transition-colors"
          >
            {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        )}

        {/* ── Mobile dropdown panel ──────────────────────────────────── */}
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
                  `block px-5 py-2.5 text-sm font-bold transition-colors ${
                    isActive
                      ? 'text-lgu-700 bg-lgu-50'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-lgu-700'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2 px-5 pb-1">
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="w-full text-left text-sm font-bold text-lgu-700
                           hover:text-lgu-800 py-1.5 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Sign out — absolutely pinned to far right edge ────────────── */}
      <button
        onClick={logout}
        className="absolute right-4 bg-lgu-700 hover:bg-lgu-800 text-white text-xs
                   font-semibold rounded-full px-5 py-3 transition-colors
                   whitespace-nowrap shadow-sm shrink-0"
      >
        Sign out
      </button>

    </div>
  )
}
