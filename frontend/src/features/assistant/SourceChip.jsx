/**
 * SourceChip — category-coloured pill with similarity score.
 * Shared between AssistantBubble (knowledge answers) and ActionPlanCard.
 *
 * Props:
 *   source : { document_id, category, chunk_preview, score }
 */

const CATEGORY_COLOURS = {
  'Fees':            'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Examination':     'bg-blue-50   text-blue-700   border-blue-200',
  'Scholarship':     'bg-green-50  text-green-700  border-green-200',
  'Registration':    'bg-purple-50 text-purple-700 border-purple-200',
  'Academic Policy': 'bg-orange-50 text-orange-700 border-orange-200',
  'Department Info': 'bg-cyan-50   text-cyan-700   border-cyan-200',
  'FAQ':             'bg-gray-50   text-gray-600   border-gray-200',
}

export default function SourceChip({ source }) {
  const colour = CATEGORY_COLOURS[source.category] || 'bg-gray-50 text-gray-600 border-gray-200'

  return (
    <span
      title={source.chunk_preview}
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colour}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
           className="w-3 h-3 shrink-0">
        <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 1 13 4.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 5 12.5v-9Zm7 1.383L12.378 3.25a.75.75 0 0 0-.128.122V6h2.25V5.25a.75.75 0 0 0-.52-.708V4.883Z" />
        <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v6A1.5 1.5 0 0 0 4.5 15h5a1.5 1.5 0 0 0 1.5-1.5v-.5h-5A2.5 2.5 0 0 1 3.5 10.5v-4H4.5Z" />
      </svg>
      {source.category}
      <span className="opacity-60">· {Math.round(source.score * 100)}%</span>
    </span>
  )
}
