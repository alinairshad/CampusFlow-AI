/**
 * Societies API wrappers.
 * Admin write endpoints require a token; read endpoints are public.
 */
import axios from 'axios'

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

// ---------------------------------------------------------------------------
// Admin (write) — token required
// ---------------------------------------------------------------------------

/** POST /admin/societies/ */
export async function createSociety(data, token) {
  const res = await axios.post(`${base}/admin/societies/`, data, {
    headers: authHeaders(token),
  })
  return res.data
}

/** PUT /admin/societies/{id} */
export async function updateSociety(id, data, token) {
  const res = await axios.put(`${base}/admin/societies/${id}`, data, {
    headers: authHeaders(token),
  })
  return res.data
}

/** DELETE /admin/societies/{id} */
export async function deleteSociety(id, token) {
  await axios.delete(`${base}/admin/societies/${id}`, {
    headers: authHeaders(token),
  })
}

// ---------------------------------------------------------------------------
// Public (read) — no token needed
// ---------------------------------------------------------------------------

/** GET /societies/ */
export async function listSocieties() {
  const res = await axios.get(`${base}/societies/`)
  return res.data   // { societies: [...], total: N }
}

/** GET /societies/search?q= */
export async function searchSocieties(q) {
  const res = await axios.get(`${base}/societies/search`, { params: { q } })
  return res.data
}

/** GET /societies/{id} */
export async function getSociety(id) {
  const res = await axios.get(`${base}/societies/${id}`)
  return res.data
}
