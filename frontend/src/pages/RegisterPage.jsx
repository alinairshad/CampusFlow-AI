import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerStudent } from '../api/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', semester: '', batch: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await registerStudent(form)
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lgu-400"

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        {/* LGU logo */}
        <div className="flex flex-col items-center mb-6">
          <img src="/lgu-logo.png" alt="LGU" className="h-16 w-auto mb-3" />
          <h1 className="text-2xl font-bold text-lgu-700">CampusFlow AI</h1>
          <p className="text-gray-500 text-sm mt-1">Create a student account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className={inputCls} placeholder="Alice Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className={inputCls} placeholder="you@lgu.edu.pk" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required className={inputCls} placeholder="Min. 8 chars, at least one letter and one digit" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" name="department" value={form.department} onChange={handleChange} required className={inputCls} placeholder="Computer Science" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <input type="text" name="semester" value={form.semester} onChange={handleChange} required className={inputCls} placeholder="3" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch / Year</label>
            <input type="text" name="batch" value={form.batch} onChange={handleChange} required className={inputCls} placeholder="2023" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
                  className="w-full bg-lgu-700 hover:bg-lgu-800 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-lgu-700 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}
