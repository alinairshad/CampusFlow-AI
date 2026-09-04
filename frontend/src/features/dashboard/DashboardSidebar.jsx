/**
 * DashboardSidebar — fixed left sidebar for the Student Dashboard.
 *
 * Props:
 *   isOpen    : boolean        — mobile drawer open state
 *   onClose   : () => void     — close mobile drawer
 *   onSignOut : () => void     — calls logout()
 */
import { useLocation, NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Assistant',
    to: '/assistant',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Applications',
    to: '/applications',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Directory',
    to: '/directory',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v13.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5H2v-13H1.75A.75.75 0 0 1 1 2.75ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm4 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 9a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1A.5.5 0 0 1 4 10V9Zm4 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1A.5.5 0 0 1 8 10V9ZM14.5 6a.5.5 0 0 0-.5.5v9.75a.25.25 0 0 1-.25.25H13a.75.75 0 0 0 0 1.5h3.25A1.75 1.75 0 0 0 18 16.25V6.75A.75.75 0 0 0 17.25 6H14.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Societies',
    to: '/societies',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
      </svg>
    ),
  },
  {
    label: 'Mentors',
    to: '/mentors',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 15a4 4 0 0 0-8 0v3h8v-3ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM2 15a4 4 0 0 1 4-4v.68A5.976 5.976 0 0 0 4 15v3H2v-3ZM16 15a4 4 0 0 0-4-4v.68A5.976 5.976 0 0 1 14.002 15L14 18h2v-3Z" />
      </svg>
    ),
  },
]

function NavList({ onLinkClick }) {
  const { pathname } = useLocation()

  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {NAV_ITEMS.map(({ label, to, icon }) => {
        const isActive = pathname === to || pathname.startsWith(to + '/')
        return (
          <NavLink
            key={to}
            to={to}
            onClick={onLinkClick}
            className={[
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
              isActive
                ? 'bg-white/20 text-white font-semibold shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10',
            ].join(' ')}
          >
            <span className={`shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>
              {icon}
            </span>
            {label}
            {isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

function SidebarPanel({ onLinkClick, onSignOut }) {
  return (
    <div className="flex flex-col h-full w-52"
         style={{ background: 'linear-gradient(180deg, #1B5E20 0%, #144D18 100%)' }}>

      {/* Brand header */}
      <div className="px-4 py-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                 className="w-4 h-4 text-white">
              <path d="M10.394 2.08a1 1 0 0 0-.788 0l-7 3a1 1 0 0 0 0 1.84L5.25 8.051a.999.999 0 0 1 .356-.257l4-1.714a1 1 0 1 1 .788 1.838L7.667 9.088l1.94.831a1 1 0 0 0 .787 0l7-3a1 1 0 0 0 0-1.838l-7-3ZM3.31 9.397 5 10.12v4.102a8.969 8.969 0 0 0-1.05-.174 1 1 0 0 1-.89-.89 11.115 11.115 0 0 1 .25-3.762ZM9.3 16.573A9.026 9.026 0 0 0 10 17c.385 0 .764-.023 1.14-.068a.5.5 0 0 0 .17-.044l3.45-1.48.006-.002.042-.018a1 1 0 0 0 .538-1.169 3.163 3.163 0 0 0-.3-.634c-.227-.36-.54-.737-.927-1.097-.386-.36-.827-.664-1.286-.885a.5.5 0 0 0-.477.015l-2.355 1.297A9 9 0 0 1 9.3 16.573Z" />
              <path d="M4.5 12.196V10.79l4.394 1.882a2.998 2.998 0 0 0 2.212 0l4.394-1.882v1.406c0 1.268-2.514 2.298-5.5 2.298S4.5 13.464 4.5 12.196Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight tracking-tight">CampusFlow</p>
            <p className="text-xs text-white/45 leading-tight">AI</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10 mb-1" />

      {/* Nav items */}
      <NavList onLinkClick={onLinkClick} />

      {/* Sign out */}
      <div className="px-2 pb-4 shrink-0 border-t border-white/10 pt-2 mt-1">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs
                     font-medium text-white/50 hover:text-white hover:bg-white/10
                     transition-all duration-150"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
               className="w-4 h-4 shrink-0 opacity-70">
            <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.08a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.142l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-1.08H18.25A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function DashboardSidebar({ isOpen, onClose, onSignOut }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex shrink-0 h-screen sticky top-0">
        <SidebarPanel onLinkClick={undefined} onSignOut={onSignOut} />
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden"
             onClick={onClose} aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      <div className={[
        'fixed inset-y-0 left-0 z-40 md:hidden transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <SidebarPanel onLinkClick={onClose} onSignOut={() => { onClose(); onSignOut() }} />
      </div>
    </>
  )
}
