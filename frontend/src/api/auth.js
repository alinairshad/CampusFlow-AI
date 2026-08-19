/**
 * Auth API wrappers — register and login.
 * Base URL comes from VITE_API_BASE_URL (set in frontend/.env).
 */
import axios from 'axios'

const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

/**
 * POST /auth/register
 * @param {{ name, email, password, department, semester, batch }} data
 * @returns {{ id: string, email: string }}
 */
export async function registerStudent(data) {
  const res = await authClient.post('/auth/register', data)
  return res.data
}

/**
 * POST /auth/login
 * @param {{ email: string, password: string }} credentials
 * @returns {{ access_token: string, token_type: string }}
 */
export async function loginUser(credentials) {
  const res = await authClient.post('/auth/login', credentials)
  return res.data
}
