import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  // expectedRole is set by LandingPage when the user clicks Student or Admin card.
  // Falls back to null if the user navigated directly to /login (no role enforcement).
  const expectedRole   = location.state?.expectedRole ?? null
  const justRegistered = location.state?.registered === true

  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await loginUser({ email: form.email, password: form.password })

      // Decode the JWT payload (base64url, no verification needed — server already validated)
      const payload = JSON.parse(atob(data.access_token.split('.')[1]))
      const actualRole = payload.role  // 'student' | 'admin'

      // Role mismatch check — only enforce when an expectedRole was passed
      if (expectedRole && actualRole !== expectedRole) {
        const opposite = actualRole === 'admin' ? 'Admin' : 'Student'
        const current  = expectedRole === 'admin' ? 'Admin' : 'Student'
        setError(
          `This is ${actualRole === 'admin' ? 'an admin' : 'a student'} account. ` +
          `Please use the ${opposite} login instead.`
        )
        setLoading(false)
        return   // do NOT call login() — token is not stored
      }

      // Credentials and role match — proceed
      login(data.access_token)
      navigate(actualRole === 'admin' ? '/admin' : '/dashboard', { replace: true })

    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map(d => d.msg).join(', ')
            : 'Login failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Heading reflects which portal the user came from
  const roleLabel = expectedRole === 'admin'
    ? 'Admin Portal'
    : expectedRole === 'student'
      ? 'Student Portal'
      : 'Login'

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-6">
          <img src="/lgu-logo.png" alt="LGU" className="h-16 w-auto mb-3" />
          <h1 className="text-2xl font-bold text-lgu-700">CampusFlow AI</h1>
          <p className="text-gray-500 text-sm mt-1">{roleLabel}</p>
        </div>

        {justRegistered && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200
                        rounded-lg px-3 py-2 mb-4">
            Account created — login below.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-lgu-400"
              placeholder="you@lgu.edu.pk"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" name="password" value={form.password}
              onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-lgu-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200
                          rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-lgu-700 hover:bg-lgu-800 disabled:opacity-50
                       text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-500">
          No account?{' '}
          <Link to="/register" className="text-lgu-700 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}
