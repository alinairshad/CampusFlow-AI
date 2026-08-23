/**
 * Admin API wrappers.
 * All calls require an admin JWT.
 */
import axios from 'axios'

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

/**
 * GET /admin/stats/
 * @param {string} token
 * @returns {Promise<{
 *   total_documents: number,
 *   total_students: number,
 *   total_queries: number,
 *   total_directory_entries: number,
 * }>}
 */
export async function getAdminStats(token) {
  const res = await axios.get(`${base}/admin/stats/`, {
    headers: authHeaders(token),
  })
  return res.data
}
