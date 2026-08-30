import { Link } from 'react-router-dom'

function RoleCard({ icon, label, description, to }) {
  return (
    <Link
      to={to}
      className="flex-1 min-w-0 bg-white rounded-2xl border-2 border-gray-200
                 hover:border-lgu-400 hover:shadow-lg transition-all p-8
                 flex flex-col items-center text-center gap-4 group"
    >
      <div className="w-16 h-16 rounded-full bg-lgu-100 group-hover:bg-lgu-200
                      flex items-center justify-center transition-colors">
        <span className="text-3xl" role="img" aria-label={label}>{icon}</span>
      </div>
      <div>
        <p className="text-base font-bold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>
      <span className="text-xs font-medium text-lgu-700 group-hover:underline">
        Sign in →
      </span>
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Branding */}
      <div className="flex flex-col items-center mb-10">
        <img src="/lgu-logo.png" alt="LGU" className="h-16 w-auto mb-4" />
        <h1 className="text-2xl font-bold text-lgu-700">LGU AI Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your intelligent university companion
        </p>
      </div>

      {/* Role picker */}
      <div className="w-full max-w-sm space-y-4">
        <div className="flex gap-4">
          <RoleCard
            icon="🎓"
            label="Student"
            description="For students"
            to="/login"
          />
          <RoleCard
            icon="🛡️"
            label="Admin"
            description="For administrators"
            to="/login"
          />
        </div>

        <p className="text-center text-xs text-gray-400 pt-2">
          New student?{' '}
          <Link to="/register" className="text-lgu-700 hover:underline font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
