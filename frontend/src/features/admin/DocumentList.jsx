/**
 * DocumentList — renders the knowledge-base document library with
 * a delete button per row. Calls onDeleted after successful deletion
 * so the parent can refresh.
 *
 * Props:
 *   documents  : DocumentListItem[]
 *   token      : string
 *   loading    : boolean
 *   onDeleted  : () => void
 */
import { useState } from 'react'
import { deleteDocument } from '../../api/documents'

// Category badge colours
const CATEGORY_COLOURS = {
  'Fees':            'bg-yellow-100 text-yellow-800',
  'Examination':     'bg-blue-100   text-blue-800',
  'Scholarship':     'bg-green-100  text-green-800',
  'Registration':    'bg-purple-100 text-purple-800',
  'Academic Policy': 'bg-orange-100 text-orange-800',
  'Department Info': 'bg-cyan-100   text-cyan-800',
  'FAQ':             'bg-gray-100   text-gray-700',
}

function CategoryBadge({ category }) {
  const colour = CATEGORY_COLOURS[category] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colour}`}>
      {category}
    </span>
  )
}

function StatusBadge({ status }) {
  return status === 'processed' ? (
    <span className="inline-flex items-center gap-1 text-xs text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      Indexed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-red-600">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
      Failed
    </span>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function DocumentList({ documents, token, loading, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.title}"? This will also remove all its indexed chunks.`)) {
      return
    }
    setDeletingId(doc.id)
    setDeleteError('')
    try {
      await deleteDocument(doc.id, token)
      onDeleted()
    } catch (err) {
      const detail = err.response?.data?.detail
      setDeleteError(typeof detail === 'string' ? detail : 'Delete failed. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-400 text-center py-8">Loading documents…</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Knowledge base</h2>
        <span className="text-xs text-gray-400">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
      </div>

      {deleteError && (
        <p className="mx-6 mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {deleteError}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          No documents yet — upload one above.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <li key={doc.id} className="px-4 sm:px-6 py-4 flex items-start gap-3">
              {/* File type icon */}
              <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-lgu-50 flex items-center justify-center">
                <span className="text-xs font-bold text-lgu-600 uppercase">
                  {doc.filename.split('.').pop()}
                </span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                {/* Title — truncate on sm+, wrap on xs to stay readable */}
                <p className="text-sm font-medium text-gray-800 break-words sm:truncate">{doc.title}</p>
                {/* Filename hidden on very narrow screens to avoid overflow */}
                <p className="text-xs text-gray-400 truncate mt-0.5 hidden xs:block sm:block">{doc.filename}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <CategoryBadge category={doc.category} />
                  <StatusBadge status={doc.status} />
                  <span className="text-xs text-gray-400">{formatDate(doc.uploaded_at)}</span>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                aria-label={`Delete ${doc.title}`}
                className="shrink-0 mt-0.5 text-gray-400 hover:text-red-500
                           disabled:opacity-40 transition-colors p-1 rounded"
              >
                {deletingId === doc.id ? (
                  <span className="text-xs">…</span>
                ) : (
                  // Trash icon (inline SVG — no icon library needed)
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                       fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd"
                      d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.177-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                      clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
