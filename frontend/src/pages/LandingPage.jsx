import { Link } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Role card — glassmorphism style, hover lift + scale
// ---------------------------------------------------------------------------
function RoleCard({ icon, label, to, state }) {
  return (
    <Link
      to={to}
      state={state}
      className="flex-1 min-w-0 flex flex-col items-center text-center gap-4
                 rounded-2xl px-6 py-8 cursor-pointer
                 transition-all duration-300 ease-out
                 hover:-translate-y-1.5 hover:scale-[1.03]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      style={{
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}
      // Inline hover shadow handled via onMouseEnter/Leave for the glow —
      // Tailwind can't easily express box-shadow changes at hover with CSS vars
    >
      {/* Icon circle */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center
                      transition-transform duration-300"
           style={{ background: 'rgba(255,255,255,0.18)' }}>
        <span className="text-4xl leading-none select-none" role="img" aria-label={label}>
          {icon}
        </span>
      </div>

      {/* Label */}
      <p className="text-base font-semibold text-white tracking-wide">{label}</p>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    /*
     * Root: relative + overflow-hidden so the video + overlay stay contained.
     * bg-lgu-800 is the fallback before the video loads or if it fails.
     */
    <div className="relative min-h-screen bg-lgu-800 flex flex-col
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

      {/* ── Overlay — lighter than before so campus is clearly visible ─ */}
      <div className="absolute inset-0" aria-hidden="true"
           style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.52) 100%)' }} />

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center">

        {/* ── Logo ─────────────────────────────────────────────────────
            mix-blend-mode: multiply makes the white background disappear
            over the dark overlay, showing the crest cleanly.          */}
        <div className="mb-6">
          <img
            src="/lgu-logo.png"
            alt="Lahore Garrison University"
            className="h-24 w-24 sm:h-28 sm:w-28 object-contain rounded-full"
            style={{ mixBlendMode: 'screen', filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.15))' }}
          />
        </div>

        {/* ── Wordmark + subtitle ───────────────────────────────────── */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            CampusFlow AI
          </h1>
          <p className="text-sm sm:text-base text-white/70 mt-2 font-medium tracking-wide">
            Your smarter campus experience.
          </p>
        </div>

        {/* ── Role cards ───────────────────────────────────────────── */}
        <div className="flex gap-4 w-full mb-8">
          <RoleCard
            icon="🎓"
            label="Student"
            to="/login"
            state={{ expectedRole: 'student' }}
          />
          <RoleCard
            icon="🛡️"
            label="Admin"
            to="/login"
            state={{ expectedRole: 'admin' }}
          />
        </div>

        {/* ── Register link ─────────────────────────────────────────── */}
        <p className="text-sm text-white/60 font-medium">
          New student?{' '}
          <Link
            to="/register"
            className="text-white font-semibold underline underline-offset-2
                       decoration-white/40 hover:decoration-white transition-all duration-200"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
