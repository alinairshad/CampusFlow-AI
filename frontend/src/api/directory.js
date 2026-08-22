/**
 * Directory API wrappers.
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

/** POST /admin/directory/ */
export async function createDirectoryEntry(data, token) {
  const res = await axios.post(`${base}/admin/directory/`, data, {
    headers: authHeaders(token),
  })
  return res.data
}

/** PUT /admin/directory/{id} */
export async function updateDirectoryEntry(id, data, token) {
  const res = await axios.put(`${base}/admin/directory/${id}`, data, {
    headers: authHeaders(token),
  })
  return res.data
}

/** DELETE /admin/directory/{id} */
export async function deleteDirectoryEntry(id, token) {
  await axios.delete(`${base}/admin/directory/${id}`, {
    headers: authHeaders(token),
  })
}

// ---------------------------------------------------------------------------
// Public (read) — no token needed
// ---------------------------------------------------------------------------

/** GET /directory/ */
export async function listDirectoryEntries() {
  const res = await axios.get(`${base}/directory/`)
  return res.data   // { entries: [...], total: N }
}

/** GET /directory/search?q= */
export async function searchDirectoryEntries(q) {
  const res = await axios.get(`${base}/directory/search`, { params: { q } })
  return res.data
}

/** GET /directory/{id} */
export async function getDirectoryEntry(id) {
  const res = await axios.get(`${base}/directory/${id}`)
  return res.data
}

/** GET /search?q= (unified) */
export async function unifiedSearch(q) {
  const res = await axios.get(`${base}/search/`, { params: { q } })
  return res.data
}
