import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerStudent } from '../api/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    department: '', semester: '', batch: '', roll_number: '',
  })
  const [error,   setError]   = useState('')
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
      await registerStudent(form)
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string' ? detail
          : Array.isArray(detail) ? detail.map(d => d.msg).join(', ')
          : 'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm
                    text-gray-800 placeholder-gray-400
                    focus:outline-none focus:border-lgu-500 focus:ring-2 focus:ring-lgu-100
                    transition-colors duration-150`

  return (
    <div className="relative min-h-screen flex items-center justify-center
                    px-4 py-10 overflow-hidden"
         style={{ backgroundColor: '#1a2e1a' }}>

      {/* Campus background */}
      <img src="/lgu-campus.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"
           className="absolute inset-0 w-full h-full object-cover object-center" />

      {/* Vignette overlay */}
      <div className="absolute inset-0" aria-hidden="true"
           style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.12) 65%, rgba(0,0,0,0.48) 100%)' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[400px] bg-white rounded-2xl
                      shadow-2xl border border-gray-100 overflow-hidden">

        <div className="h-1 bg-lgu-700" />

        <div className="px-7 py-7">

          {/* Branding */}
          <div className="flex flex-col items-center mb-6">
            <img src="/lgu-logo.png" alt="Lahore Garrison University"
                 className="h-14 w-14 object-contain mb-3"
                 style={{ mixBlendMode: 'multiply' }} />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              CampusFlow AI
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Full name
              </label>
              <input type="text" name="name" value={form.name}
                     onChange={handleChange} required
                     className={inputCls} placeholder="Alice Smith" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input type="email" name="email" value={form.email}
                     onChange={handleChange} required
                     className={inputCls} placeholder="you@lgu.edu.pk"
                     autoComplete="email" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input type="password" name="password" value={form.password}
                     onChange={handleChange} required
                     className={inputCls}
                     placeholder="Min. 8 chars, letter + digit"
                     autoComplete="new-password" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <input type="text" name="department" value={form.department}
                       onChange={handleChange} required
                       className={inputCls} placeholder="Computer Science" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Semester
                </label>
                <input type="text" name="semester" value={form.semester}
                       onChange={handleChange} required
                       className={inputCls} placeholder="3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Batch / Year
              </label>
              <input type="text" name="batch" value={form.batch}
                     onChange={handleChange} required
                     className={inputCls} placeholder="2023" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Roll Number
              </label>
              <input type="text" name="roll_number" value={form.roll_number}
                     onChange={handleChange} required
                     className={inputCls} placeholder="Fa-23/BSSE/199-D"
                     autoComplete="off" spellCheck="false" />
              <p className="mt-1.5 text-xs text-gray-400">
                Format: <span className="font-medium text-gray-500">Fa-23/BSSE/199-D</span>
                {' '}(semester/programme/number-section)
              </p>
            </div>

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

            <button type="submit" disabled={loading}
                    className="w-full bg-lgu-700 hover:bg-lgu-600 active:bg-lgu-800
                               disabled:opacity-50 text-white font-semibold rounded-xl
                               py-3 text-sm tracking-wide transition-all duration-150
                               shadow-sm hover:shadow-md">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1.5">Already have an account?</p>
            <Link to="/login"
                  className="text-sm font-semibold text-lgu-700 hover:text-lgu-600
                             hover:underline transition-colors">
              Login →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
