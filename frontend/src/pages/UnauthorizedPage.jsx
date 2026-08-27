import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <p className="text-5xl font-bold text-lgu-300 mb-4">403</p>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Access denied</h1>
        <p className="text-gray-500 text-sm mb-6">
          You don't have permission to view this page.
        </p>
        <Link to="/login" className="text-sm text-lgu-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
