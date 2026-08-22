import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function StudentDashboardPlaceholder() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold text-indigo-600">CampusFlow AI</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:block">{user?.user_id}</span>
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Full dashboard coming in Stage 7. The AI assistant is available now.
          </p>
        </div>

        {/* Assistant entry card */}
        <Link
          to="/assistant"
          className="block bg-white rounded-2xl border border-gray-200 shadow-sm
                     hover:border-indigo-300 hover:shadow-md transition-all p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-indigo-600 text-lg font-bold">AI</span>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800">
                Campus Assistant
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Ask about fees, exams, scholarships, registration, and more.
              </p>
            </div>
            {/* Arrow */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                 fill="currentColor" className="w-5 h-5 text-gray-400 ml-auto shrink-0">
              <path fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd" />
            </svg>
          </div>
        </Link>

        {/* Placeholder cards for future stages */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Applications', sub: 'Coming — Stage 5', to: '/applications', live: true },
            { label: 'Directory',    sub: 'Find offices & departments', to: '/directory', live: true },
          ].map(({ label, sub, to, live }) =>
            live ? (
              <Link key={label} to={to}
                    className="bg-white rounded-2xl border border-gray-200 p-5
                               hover:border-indigo-300 hover:shadow-sm transition-all">
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </Link>
            ) : (
              <div key={label}
                   className="bg-white rounded-2xl border border-gray-100 p-5 opacity-60 cursor-not-allowed">
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}
