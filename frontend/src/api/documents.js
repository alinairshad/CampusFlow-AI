/**
 * Admin document API wrappers.
 * All calls require an admin JWT passed as `token`.
 */
import axios from 'axios'

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

/**
 * POST /admin/documents/
 * Uploads a file with category (and optional title).
 *
 * @param {File}     file
 * @param {string}   category  — one of the DocumentCategory enum values
 * @param {string}   [title]   — optional display title
 * @param {string}   token
 * @param {Function} [onProgress]  — called with 0-100 percent during upload
 * @returns {Promise<DocumentUploadResponse>}
 */
export async function uploadDocument(file, category, title, token, onProgress) {
  const form = new FormData()
  form.append('file', file)
  form.append('category', category)
  if (title && title.trim()) {
    form.append('title', title.trim())
  }

  const res = await axios.post(`${base}/admin/documents/`, form, {
    headers: {
      ...authHeaders(token),
      // Let axios set Content-Type with the multipart boundary automatically
    },
    onUploadProgress: onProgress
      ? (evt) => {
          if (evt.total) {
            onProgress(Math.round((evt.loaded * 100) / evt.total))
          }
        }
      : undefined,
  })
  return res.data
}

/**
 * GET /admin/documents/
 * @param {string} token
 * @returns {Promise<DocumentListResponse>}
 */
export async function listDocuments(token) {
  const res = await axios.get(`${base}/admin/documents/`, {
    headers: authHeaders(token),
  })
  return res.data
}

/**
 * DELETE /admin/documents/{id}
 * @param {string} docId
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deleteDocument(docId, token) {
  await axios.delete(`${base}/admin/documents/${docId}`, {
    headers: authHeaders(token),
  })
}
