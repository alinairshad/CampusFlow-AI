import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { useAuth } from '../auth/AuthContext'

// ---------------------------------------------------------------------------
// Eye icons for password visibility toggle (inline SVG, no extra dep)
// ---------------------------------------------------------------------------
function EyeOpen() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  )
}
function EyeOff() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
      <path d="M10.748 13.93l2.523 2.523a10.055 10.055 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// LoginPage — UI redesigned, all auth logic unchanged
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()

  // ── Existing auth state (unchanged) ────────────────────────────────────
  const expectedRole   = location.state?.expectedRole ?? null
  const justRegistered = location.state?.registered === true

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  // ── New UI state ────────────────────────────────────────────────────────
  const [showPw, setShowPw] = useState(false)

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
      const payload    = JSON.parse(atob(data.access_token.split('.')[1]))
      const actualRole = payload.role
      if (expectedRole && actualRole !== expectedRole) {
        const opposite = actualRole === 'admin' ? 'Admin' : 'Student'
        setError(
          `This is ${actualRole === 'admin' ? 'an admin' : 'a student'} account. ` +
          `Please use the ${opposite} login instead.`
        )
        setLoading(false)
        return
      }
      login(data.access_token)
      navigate(actualRole === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string' ? detail
          : Array.isArray(detail) ? detail.map(d => d.msg).join(', ')
          : 'Login failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const roleLabel = expectedRole === 'admin'
    ? 'Admin Portal'
    : expectedRole === 'student'
      ? 'Student Portal'
      : 'Welcome back'

  const roleBadgeColor = expectedRole === 'admin'
    ? 'bg-blue-50 text-blue-700 border-blue-100'
    : 'bg-lgu-50 text-lgu-700 border-lgu-100'

  // shared input class
  const inputCls = `w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm
                    text-gray-800 placeholder-gray-400
                    focus:outline-none focus:border-lgu-500 focus:ring-2 focus:ring-lgu-100
                    transition-colors duration-150`

  return (
    /* ── Page shell — same campus background as LandingPage ─────────── */
    <div className="relative min-h-screen flex items-center justify-center
                    px-4 py-10 overflow-hidden"
         style={{ backgroundColor: '#1a2e1a' }}>

      {/* Campus background image */}
      <img src="/lgu-campus.jpg" alt="" aria-hidden="true"
           className="absolute inset-0 w-full h-full object-cover object-center" />

      {/* Vignette overlay — matches LandingPage center brightness */}
      <div className="absolute inset-0" aria-hidden="true"
           style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.12) 65%, rgba(0,0,0,0.48) 100%)' }} />

      {/* ── Login card ─────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl
                      shadow-2xl border border-gray-100 overflow-hidden">

        {/* Green top accent bar */}
        <div className="h-1 bg-lgu-700" />

        <div className="px-8 py-8">

          {/* ── Branding ───────────────────────────────────────────── */}
          <div className="flex flex-col items-center mb-7">
            <img
              src="/lgu-logo.png"
              alt="Lahore Garrison University"
              className="h-16 w-16 object-contain mb-4"
              style={{ mixBlendMode: 'multiply' }}
            />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              CampusFlow AI
            </h1>
            <span className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full border ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>

          {/* ── Success banner ─────────────────────────────────────── */}
          {justRegistered && (
            <div className="mb-5 flex items-center gap-2 text-sm text-green-700
                            bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                   className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              Account created — please log in.
            </div>
          )}

          {/* ── Form ───────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase
                                tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                       fill="currentColor" className="w-4 h-4">
                    <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                    <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                  </svg>
                </span>
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} required
                  className={inputCls + ' pl-10'}
                  placeholder="you@lgu.edu.pk"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase
                                tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                       fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                  </svg>
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password" value={form.password}
                  onChange={handleChange} required
                  className={inputCls + ' pl-10 pr-11'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600
                              bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                     fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full bg-lgu-700 hover:bg-lgu-600 active:bg-lgu-800
                         disabled:opacity-50 text-white font-semibold rounded-xl
                         py-3 text-sm tracking-wide transition-all duration-150
                         shadow-sm hover:shadow-md"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg"
                         fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                              stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Logging in…
                  </span>
                : 'Login'
              }
            </button>
          </form>

          {/* ── Register CTA ───────────────────────────────────────── */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1.5">Don't have an account?</p>
            <Link
              to="/register"
              className="text-sm font-semibold text-lgu-700 hover:text-lgu-600
                         hover:underline transition-colors"
            >
              Create an account →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
