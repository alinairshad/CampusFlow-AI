/**
 * Axios client and endpoint wrappers.
 * One file per resource added here in subsequent stages.
 * Implemented incrementally from Stage 1 onward.
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT from memory/context on every request (wired in Stage 1)
apiClient.interceptors.request.use((config) => {
  const token = window.__campusflow_token__ // replaced by AuthContext in Stage 1
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
