/**
 * AdminSidebar — fixed left sidebar for the Admin Dashboard.
 * Same visual style as DashboardSidebar (bg-lgu-700, white text).
 *
 * Props:
 *   isOpen    : boolean    — mobile drawer open state
 *   onClose   : () => void — close mobile drawer
 *   onSignOut : () => void — calls logout()
 */

const ADMIN_NAV = [
  {
    label: 'Dashboard',
    to: '/admin',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
      </svg>
    ),
  },
]

function SidebarPanel({ onSignOut, onLinkClick }) {
  return (
    <div className="flex flex-col h-full w-56 bg-lgu-700">

      {/* Wordmark */}
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <span className="text-base font-bold text-white tracking-tight">
          CampusFlow AI
        </span>
        <span className="ml-2 text-xs font-medium text-white/50">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {ADMIN_NAV.map(({ label, to, icon }) => (
          <a
            key={to}
            href={to}
            onClick={(e) => { e.preventDefault(); if (onLinkClick) onLinkClick(to) }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold
                       bg-white/15 text-white border-l-2 border-white pl-[10px]
                       transition-all duration-150"
          >
            <span className="shrink-0 opacity-90">{icon}</span>
            {label}
          </a>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5 shrink-0 border-t border-white/10 pt-3">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                     font-medium text-white/60 hover:text-white hover:bg-white/10
                     transition-all duration-150 border-l-2 border-transparent pl-[10px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
               className="w-4 h-4 shrink-0">
            <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.08a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.142l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-1.08H18.25A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function AdminSidebar({ isOpen, onClose, onSignOut }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex shrink-0 h-screen sticky top-0">
        <SidebarPanel onSignOut={onSignOut} onLinkClick={null} />
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-40 md:hidden transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <SidebarPanel
          onSignOut={() => { onClose(); onSignOut() }}
          onLinkClick={onClose}
        />
      </div>
    </>
  )
}
