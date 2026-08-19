/**
 * Shared axios client.
 * Token injection is handled per-feature by passing the token explicitly,
 * or by using the auth-aware client from api/auth.js.
 * Later stages (assistant, applications, etc.) will import this client
 * and attach the token via a request interceptor seeded from AuthContext.
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

export default apiClient
