import { Link } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Role card — refined glassmorphism, per-role icon color
// ---------------------------------------------------------------------------
function RoleCard({ icon, label, to, state, iconBg }) {
  return (
    <Link
      to={to}
      state={state}
      className="flex-1 min-w-0 flex flex-col items-center text-center gap-4
                 rounded-2xl px-6 py-8 cursor-pointer group
                 transition-all duration-250 ease-out
                 hover:-translate-y-1 hover:scale-[1.025]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      style={{
        background: 'rgba(232,245,233,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(200,230,201,0.60)',
        borderTop: '3px solid #1B5E20',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        transition: 'transform 250ms ease-out, box-shadow 250ms ease-out, background 250ms ease-out',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(232,245,233,0.85)'
        e.currentTarget.style.boxShadow  = '0 8px 32px rgba(0,0,0,0.18)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(232,245,233,0.72)'
        e.currentTarget.style.boxShadow  = '0 4px 24px rgba(0,0,0,0.12)'
      }}
    >
      {/* Icon circle — per-role tint */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
           style={{ background: iconBg, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
        <span className="text-3xl leading-none select-none" role="img" aria-label={label}>
          {icon}
        </span>
      </div>

      {/* Label */}
      <p className="text-sm font-semibold text-gray-800 tracking-widest uppercase"
         style={{ textShadow: 'none' }}>
        {label}
      </p>
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
    <div className="relative min-h-screen flex flex-col
                    items-center justify-center px-4 py-12 overflow-hidden"
         style={{ backgroundColor: '#1a2e1a' }}>

      {/* ── Background image ─────────────────────────────────────────── */}
      <img
        src="/lgu-campus.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* ── Overlay — vignette on edges only, center stays bright
              so the light-green cards composite over the actual photo ─ */}
      <div className="absolute inset-0" aria-hidden="true"
           style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 35%, rgba(0,0,0,0.10) 65%, rgba(0,0,0,0.50) 100%)' }} />

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
        <div className="flex items-stretch w-full mb-8" style={{ gap: 0 }}>
          <RoleCard
            icon="🎓"
            label="Student"
            to="/login"
            state={{ expectedRole: 'student' }}
            iconBg="rgba(134,197,134,0.28)"
          />
          {/* Subtle vertical divider */}
          <div className="shrink-0 w-px self-stretch mx-3"
               style={{ background: 'rgba(255,255,255,0.14)' }} />
          <RoleCard
            icon="🛡️"
            label="Admin"
            to="/login"
            state={{ expectedRole: 'admin' }}
            iconBg="rgba(120,160,210,0.28)"
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
