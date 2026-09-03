import { Link } from 'react-router-dom'

function RoleCard({ icon, label, to, state }) {
  return (
    <Link
      to={to}
      state={state}
      className="flex-1 min-w-0 bg-white rounded-2xl border-2 border-gray-200
                 hover:border-lgu-400 hover:shadow-lg transition-all p-8
                 flex flex-col items-center text-center gap-4 group"
    >
      <div className="w-16 h-16 rounded-full bg-lgu-100 group-hover:bg-lgu-200
                      flex items-center justify-center transition-colors">
        <span className="text-3xl" role="img" aria-label={label}>{icon}</span>
      </div>
      <p className="text-base font-bold text-gray-900">{label}</p>
    </Link>
  )
}

export default function LandingPage() {
  return (
    /*
     * Root: full-viewport, relative so the fixed video + overlay stack
     * below the content. bg-gray-50 acts as the fallback if the video
     * hasn't loaded yet or fails entirely.
     */
    <div className="relative min-h-screen bg-gray-50 flex flex-col
                    items-center justify-center px-4 py-12 overflow-hidden">

      {/* ── Background video ─────────────────────────────────────────── */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/lgu-campus.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      {/* ── Dark overlay — keeps content readable over the video ──────── */}
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />

      {/* ── Page content (z-10 so it sits above video + overlay) ─────── */}
      <div className="relative z-10 w-full flex flex-col items-center">

        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
          <img src="/lgu-logo.png" alt="LGU" className="h-28 w-auto mb-4 drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-white drop-shadow">CampusFlow AI</h1>
        </div>

        {/* Role picker */}
        <div className="w-full max-w-sm space-y-4">
          <div className="flex gap-4">
            <RoleCard icon="🎓" label="Student" to="/login" state={{ expectedRole: 'student' }} />
            <RoleCard icon="🛡️" label="Admin"   to="/login" state={{ expectedRole: 'admin'   }} />
          </div>

          <p className="text-center text-sm pt-6 font-bold">
            <span className="text-white/70">New student?</span>{' '}
            <Link to="/register" className="text-lgu-300 hover:text-white hover:underline transition-colors">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
