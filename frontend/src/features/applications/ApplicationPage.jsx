/**
 * ApplicationPage — AI Application Generator.
 *
 * States:
 *   idle          → type selector + reason textarea + generate button
 *   loading       → spinner while backend processes
 *   clarification → clarifying-question prompt (202 response)
 *   generated     → editable body text + copy + download PDF buttons
 *   error         → inline error message
 *
 * Pre-fill from React Router state (passed by ActionPlanCard's
 * "Generate Application" button):
 *   location.state.conversationId  — linked conversation
 *   location.state.applicationType — suggested type
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { generateApplication, downloadApplicationPdf } from '../../api/applications'

// ---------------------------------------------------------------------------
// Application type options (must match backend APP_TYPE_LABELS)
// ---------------------------------------------------------------------------
const APPLICATION_TYPES = [
  { value: 'fee_extension',       label: 'Fee Extension Request' },
  { value: 'leave_request',       label: 'Leave of Absence Request' },
  { value: 'course_withdrawal',   label: 'Course Withdrawal Request' },
  { value: 'transcript_request',  label: 'Official Transcript Request' },
  { value: 'scholarship_request', label: 'Scholarship Application' },
  { value: 'department_transfer', label: 'Department Transfer Request' },
  { value: 'exam_related',        label: 'Examination-Related Request' },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ClarificationPrompt({ question, onAnswer }) {
  const [answer, setAnswer] = useState('')

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
             className="w-4 h-4 text-amber-600 shrink-0 mt-0.5">
          <path fillRule="evenodd"
            d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800 mb-0.5">One more thing</p>
          <p className="text-sm text-amber-900">{question}</p>
        </div>
      </div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here…"
        rows={3}
        className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-amber-400
                   bg-white resize-none"
      />
      <button
        onClick={() => onAnswer(answer)}
        disabled={!answer.trim()}
        className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40
                   text-white text-sm font-medium rounded-xl py-2 transition-colors"
      >
        Continue
      </button>
    </div>
  )
}

function GeneratedApplication({ appId, bodyText, onBodyChange, onDownload, downloading }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bodyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that block clipboard without HTTPS
      const ta = document.createElement('textarea')
      ta.value = bodyText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          Application draft
        </p>
        <span className="text-xs text-gray-400">Edit before downloading</span>
      </div>

      {/* Editable body textarea */}
      <textarea
        value={bodyText}
        onChange={(e) => onBodyChange(e.target.value)}
        rows={14}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm
                   focus:outline-none focus:ring-2 focus:ring-indigo-400
                   leading-relaxed resize-y font-[system-ui]"
        aria-label="Application body text — edit as needed"
      />

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2
                     border border-gray-300 hover:border-gray-400 rounded-xl
                     py-2.5 text-sm font-medium text-gray-700 transition-colors"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                   className="w-4 h-4 text-green-600">
                <path fillRule="evenodd"
                  d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                  clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                   className="w-4 h-4">
                <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h5.75a.75.75 0 0 0 0-1.5H3.5a.25.25 0 0 1-.25-.25v-9a.25.25 0 0 1 .25-.25H9V5a1 1 0 0 0 1 1h2.5v1.75a.75.75 0 0 0 1.5 0V5.852a1 1 0 0 0-.293-.707L11.56 2.998A1 1 0 0 0 10.852 2.7H3.5Z" />
              </svg>
              Copy text
            </>
          )}
        </button>

        <button
          onClick={onDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2
                     bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                     text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
        >
          {downloading ? (
            <>
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg"
                   fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating PDF…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                   className="w-4 h-4">
                <path d="M7.25 10.25a.75.75 0 0 0 1.5 0V4.56l1.22 1.22a.75.75 0 1 0 1.06-1.06l-2.5-2.5a.75.75 0 0 0-1.06 0l-2.5 2.5a.75.75 0 0 0 1.06 1.06l1.22-1.22v5.69Z" />
                <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ApplicationPage() {
  const { token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Pre-fill from ActionPlanCard navigation state (Task 5.11)
  const prefill = location.state || {}

  const [appType, setAppType]           = useState(prefill.applicationType || '')
  const [reason, setReason]             = useState('')
  const [convId]                        = useState(prefill.conversationId || null)

  const [phase, setPhase]               = useState('idle')
  // phases: idle | loading | clarification | generated | error

  const [clarifyQuestion, setClarifyQ]  = useState('')
  const [appId, setAppId]               = useState(null)
  const [bodyText, setBodyText]         = useState('')
  const [error, setError]               = useState('')
  const [downloading, setDownloading]   = useState(false)

  const reasonRef = useRef(null)

  // Focus reason field on mount if type is pre-filled
  useEffect(() => {
    if (prefill.applicationType && reasonRef.current) {
      reasonRef.current.focus()
    }
  }, [])

  async function handleGenerate(overrideReason) {
    const effectiveReason = overrideReason ?? reason

    if (!appType) {
      setError('Please select an application type.')
      return
    }

    setPhase('loading')
    setError('')

    try {
      const payload = { application_type: appType }
      if (effectiveReason?.trim()) payload.reason = effectiveReason.trim()
      if (convId) payload.conversation_id = convId

      const { status: httpStatus, data } = await generateApplication(payload, token)

      if (httpStatus === 202) {
        // Needs clarification
        setClarifyQ(data.clarifying_question)
        setPhase('clarification')
        return
      }

      // 201 — application ready
      setAppId(data.id)
      setBodyText(data.body_text)
      setPhase('generated')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Generation failed. Please try again.')
      setPhase('error')
    }
  }

  async function handleDownload() {
    if (!appId) return
    setDownloading(true)
    try {
      const blobUrl = await downloadApplicationPdf(appId, token)
      // Trigger browser download
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `application-${appType.replace(/_/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      setError('PDF download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  function handleReset() {
    setPhase('idle')
    setBodyText('')
    setAppId(null)
    setClarifyQ('')
    setError('')
    setReason('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/assistant"
                className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                 className="w-5 h-5">
              <path fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd" />
            </svg>
          </Link>
          <span className="text-base font-bold text-indigo-600">CampusFlow AI</span>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            Application Generator
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Generate Application</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Formal letters pre-filled from your profile, grounded in university policy.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">

          {/* ── Idle: form ───────────────────────────────────────────────── */}
          {(phase === 'idle' || phase === 'error') && (
            <>
              {/* Application type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Application type
                </label>
                <select
                  value={appType}
                  onChange={(e) => { setAppType(e.target.value); setError('') }}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">Select a type…</option>
                  {APPLICATION_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Reason textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason / context
                  <span className="text-gray-400 font-normal ml-1">
                    (required for most types)
                  </span>
                </label>
                <textarea
                  ref={reasonRef}
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError('') }}
                  placeholder="Briefly describe your situation (e.g., medical emergency with documentation)…"
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-400
                             leading-relaxed resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={() => handleGenerate()}
                disabled={!appType}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
                           text-white font-medium text-sm rounded-xl py-2.5 transition-colors"
              >
                Generate application
              </button>
            </>
          )}

          {/* ── Loading ───────────────────────────────────────────────────── */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center py-10 gap-3">
              <svg className="animate-spin w-8 h-8 text-indigo-500"
                   xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500">Generating your application…</p>
            </div>
          )}

          {/* ── Clarification ─────────────────────────────────────────────── */}
          {phase === 'clarification' && (
            <>
              <ClarificationPrompt
                question={clarifyQuestion}
                onAnswer={(answer) => {
                  setReason(answer)
                  handleGenerate(answer)
                }}
              />
              <button
                onClick={handleReset}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
              >
                Start over
              </button>
            </>
          )}

          {/* ── Generated ─────────────────────────────────────────────────── */}
          {phase === 'generated' && (
            <>
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border
                              border-green-200 rounded-xl px-3 py-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                     className="w-4 h-4 shrink-0">
                  <path fillRule="evenodd"
                    d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                    clipRule="evenodd" />
                </svg>
                Application generated. Review and edit before downloading.
              </div>

              <GeneratedApplication
                appId={appId}
                bodyText={bodyText}
                onBodyChange={setBodyText}
                onDownload={handleDownload}
                downloading={downloading}
              />

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleReset}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
              >
                Generate another application
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
