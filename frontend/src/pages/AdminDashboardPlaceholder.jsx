import { useAuth } from '../auth/AuthContext'

export default function AdminDashboardPlaceholder() {
  const { user, logout } = useAuth()
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-indigo-600 mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mb-1">Coming soon — Stage 8</p>
        <p className="text-gray-400 text-xs mb-6">
          Logged in as <span className="font-mono">{user?.user_id}</span> · role: {user?.role}
        </p>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
