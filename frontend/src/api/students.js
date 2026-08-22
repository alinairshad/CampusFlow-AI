/**
 * Student API wrappers.
 */
import axios from 'axios'

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

/** GET /students/me */
export async function getStudentProfile(token) {
  const res = await axios.get(`${base}/students/me`, { headers: authHeaders(token) })
  return res.data
}

/** PUT /students/me */
export async function updateStudentProfile(data, token) {
  const res = await axios.put(`${base}/students/me`, data, { headers: authHeaders(token) })
  return res.data
}

/** GET /students/dashboard */
export async function getStudentDashboard(token) {
  const res = await axios.get(`${base}/students/dashboard`, { headers: authHeaders(token) })
  return res.data
}
