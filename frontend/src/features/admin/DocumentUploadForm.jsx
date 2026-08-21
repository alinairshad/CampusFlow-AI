/**
 * DocumentUploadForm — file picker, category dropdown, optional title,
 * upload progress bar, and inline error/success feedback.
 *
 * Props:
 *   token      : string — admin JWT
 *   onUploaded : () => void — called after a successful upload so the
 *                parent can refresh the document list
 */
import { useRef, useState } from 'react'
import { uploadDocument } from '../../api/documents'

const CATEGORIES = [
  'Fees',
  'Examination',
  'Scholarship',
  'Registration',
  'Academic Policy',
  'Department Info',
  'FAQ',
]

const ACCEPTED = '.pdf,.docx,.txt'
const MAX_MB = 10

export default function DocumentUploadForm({ token, onUploaded }) {
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(0)   // 0-100
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function reset() {
    setFile(null)
    setCategory('')
    setTitle('')
    setProgress(0)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(e) {
    const picked = e.target.files[0]
    if (!picked) return
    setError('')
    setSuccess('')

    if (picked.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_MB} MB.`)
      e.target.value = ''
      return
    }
    setFile(picked)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file || !category) return

    setUploading(true)
    setError('')
    setSuccess('')
    setProgress(0)

    try {
      const result = await uploadDocument(
        file,
        category,
        title,
        token,
        (pct) => setProgress(pct),
      )
      setSuccess(
        `"${result.title}" uploaded — ${result.chunks_created} chunk${result.chunks_created !== 1 ? 's' : ''} indexed.`,
      )
      reset()
      onUploaded()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(', '))
      } else {
        setError('Upload failed. Please try again.')
      }
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Upload document</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File <span className="text-gray-400 font-normal">(PDF, DOCX, TXT · max {MAX_MB} MB)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileChange}
            required
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4
                       file:rounded-lg file:border-0 file:text-sm file:font-medium
                       file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100
                       cursor-pointer"
          />
          {file && (
            <p className="mt-1 text-xs text-gray-500">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Optional title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-gray-400 font-normal">(optional — derived from filename if blank)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fee Structure 2024"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Progress bar — shown only while uploading */}
        {uploading && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Success */}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={uploading || !file || !category}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
                     text-white font-medium rounded-lg py-2 text-sm transition-colors"
        >
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
      </form>
    </div>
  )
}
