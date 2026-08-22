/**
 * Applications API wrappers.
 */
import axios from 'axios'

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

/**
 * POST /applications/generate
 *
 * @param {{ application_type, reason?, conversation_id? }} payload
 * @param {string} token
 * @returns {Promise<GeneratedResponse | ClarificationResponse>}
 *
 * HTTP 201 → { id, application_type, body_text, status }
 * HTTP 202 → { needs_clarification: true, clarifying_question }
 */
export async function generateApplication(payload, token) {
  // axios throws on 4xx/5xx but NOT on 2xx — we need to detect 202 manually
  const res = await axios.post(`${base}/applications/generate`, payload, {
    headers: authHeaders(token),
    // Tell axios NOT to throw on 202 (it's a success status)
    validateStatus: (s) => s < 500,
  })
  if (res.status === 422 || res.status === 400) {
    const err = new Error(res.data?.detail || 'Validation error')
    err.response = res
    throw err
  }
  return { status: res.status, data: res.data }
}

/**
 * GET /applications
 * @param {string} token
 */
export async function listApplications(token) {
  const res = await axios.get(`${base}/applications/`, {
    headers: authHeaders(token),
  })
  return res.data
}

/**
 * GET /applications/{id}/pdf  — returns a blob URL for download
 * @param {string} appId
 * @param {string} token
 * @returns {Promise<string>} object URL pointing to the PDF blob
 */
export async function downloadApplicationPdf(appId, token) {
  const res = await axios.get(`${base}/applications/${appId}/pdf`, {
    headers: authHeaders(token),
    responseType: 'blob',
  })
  return URL.createObjectURL(res.data)
}
