/**
 * ActionPlanCard — rendered inside AssistantBubble when type === "problem".
 *
 * Sections:
 *   1. Department badge
 *   2. Required documents chips
 *   3. Numbered step list
 *   4. Highlighted "Next Action" box
 *   5. "Generate Application" button (disabled, Stage 5 tooltip)
 *   6. Source citation chips (same as knowledge answers)
 *
 * Props:
 *   actionPlan : {
 *     department    : string,
 *     required_docs : string[],
 *     steps         : string[],
 *     next_action   : string,
 *   }
 *   sources    : Source[]   — same shape as knowledge sources
 *   found      : boolean    — if false, show not-found fallback instead
 */
import SourceChip from './SourceChip'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DepartmentBadge({ department }) {
  const isUnspecified = department.toLowerCase().includes('not specified')

  return (
    <div className="flex items-start gap-2 mb-3">
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                       ${isUnspecified ? 'bg-gray-100' : 'bg-indigo-100'}`}>
        {/* Building icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
             className={`w-4 h-4 ${isUnspecified ? 'text-gray-400' : 'text-indigo-600'}`}>
          <path fillRule="evenodd"
            d="M1 2.5A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5v5.5h1.5A1.5 1.5 0 0 1 14 9.5V14h.5a.5.5 0 0 1 0 1H1.5a.5.5 0 0 1 0-1H2V2.5ZM3 14h2v-2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V14h2V2.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5V14Zm5 0v-2H8v2h0Z"
            clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none mb-0.5">
          Department
        </p>
        <p className={`text-sm font-semibold ${isUnspecified ? 'text-gray-400 italic' : 'text-gray-800'}`}>
          {department}
        </p>
      </div>
    </div>
  )
}

function RequiredDocChip({ label }) {
  const isUnspecified = label.toLowerCase().includes('not specified')
  if (isUnspecified) return null

  return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700
                     border border-amber-200 rounded-full px-2.5 py-0.5">
      {/* Document icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor"
           className="w-3 h-3 shrink-0">
        <path d="M3 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.414A1 1 0 0 0 9.707 3.707L7.293 1.293A1 1 0 0 0 6.586 1H3Zm3.5 1.5 1.5 1.5H6.5V2.5Z" />
      </svg>
      {label}
    </span>
  )
}

function StepList({ steps }) {
  const validSteps = steps.filter(
    (s) => !s.toLowerCase().includes('not specified')
  )
  if (validSteps.length === 0) return null

  return (
    <div className="mb-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        Steps to resolve
      </p>
      <ol className="space-y-2">
        {validSteps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700
                             text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function NextActionBox({ nextAction }) {
  const isUnspecified = nextAction.toLowerCase().includes('not specified') ||
                        nextAction.toLowerCase().includes("couldn't find")
  if (isUnspecified) return null

  return (
    <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-200
                    rounded-xl px-3.5 py-3 mb-3">
      {/* Lightning bolt icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
           className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5">
        <path d="M7.462 2.062a.75.75 0 0 1 .576.68V7.25h3.516a.75.75 0 0 1 .57 1.237l-5.25 6a.75.75 0 0 1-1.353-.487V9.25H2.006a.75.75 0 0 1-.57-1.238l5.25-6a.75.75 0 0 1 .776-.95Z" />
      </svg>
      <div>
        <p className="text-xs font-semibold text-indigo-700 mb-0.5">Do this first</p>
        <p className="text-sm text-indigo-900 font-medium leading-snug">{nextAction}</p>
      </div>
    </div>
  )
}

function GenerateApplicationButton() {
  return (
    <div className="relative group inline-block w-full">
      <button
        disabled
        aria-disabled="true"
        className="w-full flex items-center justify-center gap-2 text-sm font-medium
                   bg-gray-100 text-gray-400 border border-gray-200 rounded-xl py-2.5
                   cursor-not-allowed select-none"
      >
        {/* Document-plus icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
             className="w-4 h-4 shrink-0">
          <path d="M3 2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7.586A1.5 1.5 0 0 0 12 13.586V6.414L9.586 4H4.5A.5.5 0 0 0 4 4.5V3a1 1 0 0 0-1-1Zm5.5 1 2.5 2.5H8.5V3Z" />
          <path d="M8 9.5a.5.5 0 0 1 .5-.5h1v-1a.5.5 0 0 1 1 0v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1-.5-.5Z" />
        </svg>
        Generate Application
      </button>
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2
                      mb-2 w-48 text-center text-xs text-white bg-gray-700 rounded-lg
                      px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity
                      whitespace-normal z-10">
        Application generation coming in Stage 5
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2
                        border-4 border-transparent border-t-gray-700" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Not-found fallback card
// ---------------------------------------------------------------------------

function NotFoundCard() {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200
                    rounded-xl px-3.5 py-3">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
           className="w-4 h-4 text-amber-600 shrink-0 mt-0.5">
        <path fillRule="evenodd"
          d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd" />
      </svg>
      <div>
        <p className="text-xs font-semibold text-amber-700 mb-0.5">
          No verified guidance found
        </p>
        <p className="text-sm text-amber-900 leading-snug">
          This issue isn't covered in the uploaded knowledge base. Please contact
          the relevant department directly.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ActionPlanCard({ actionPlan, sources = [], found }) {
  if (!found || !actionPlan) {
    return <NotFoundCard />
  }

  const validDocs = (actionPlan.required_docs || []).filter(
    (d) => !d.toLowerCase().includes('not specified')
  )

  return (
    <div className="space-y-3">
      {/* Department */}
      <DepartmentBadge department={actionPlan.department} />

      {/* Required documents */}
      {validDocs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Documents needed
          </p>
          <div className="flex flex-wrap gap-1.5">
            {validDocs.map((doc, i) => (
              <RequiredDocChip key={i} label={doc} />
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      <StepList steps={actionPlan.steps || []} />

      {/* Next action highlight */}
      <NextActionBox nextAction={actionPlan.next_action || ''} />

      {/* Source citations */}
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {sources.map((s, i) => (
            <SourceChip key={`${s.document_id}-${i}`} source={s} />
          ))}
        </div>
      )}

      {/* Generate Application — disabled until Stage 5 */}
      <GenerateApplicationButton />
    </div>
  )
}
