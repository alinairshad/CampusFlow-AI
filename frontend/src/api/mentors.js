/**
 * Mentors API wrappers.
 * Both endpoints require a valid student JWT (auth-required, not public).
 */
import axios from 'axios'

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

/**
 * GET /mentors/
 * @param {string} token
 * @returns {Promise<{mentors: MentorListItem[], total: number}>}
 */
export async function listMentors(token) {
  const res = await axios.get(`${base}/mentors/`, { headers: authHeaders(token) })
  return res.data
}

/**
 * GET /mentors/search?q=&department=
 * @param {string} q          - keyword search (name / interests)
 * @param {string} department  - exact department filter (empty = all)
 * @param {string} token
 * @returns {Promise<{mentors: MentorListItem[], total: number}>}
 */
export async function searchMentors(q, department, token) {
  const res = await axios.get(`${base}/mentors/search`, {
    headers: authHeaders(token),
    params: { q, department },
  })
  return res.data
}
