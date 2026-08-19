/**
 * AuthContext — app-wide auth state.
 *
 * Token storage strategy (assumption G):
 *   - Primary: React state (in-memory, cleared on tab close).
 *   - Backup:  sessionStorage — survives page refresh within the same tab,
 *              but is cleared when the tab/browser closes. Safer than
 *              localStorage for an SPA token.
 *
 * The `user` object stored here is the decoded JWT payload:
 *   { user_id, role, university_id }
 * Not the full DB profile — that is fetched separately when needed.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const SESSION_KEY = 'campusflow_token'

// ---------------------------------------------------------------------------
// Decode JWT payload without verification (verification is backend's job)
// ---------------------------------------------------------------------------
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    // Restore token from sessionStorage on first render (survives page refresh)
    return sessionStorage.getItem(SESSION_KEY) || null
  })

  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (!saved) return null
    const payload = decodeJwtPayload(saved)
    if (!payload) return null
    return {
      user_id: payload.sub,
      role: payload.role,
      university_id: payload.university_id,
    }
  })

  // Keep sessionStorage in sync whenever token changes
  useEffect(() => {
    if (token) {
      sessionStorage.setItem(SESSION_KEY, token)
    } else {
      sessionStorage.removeItem(SESSION_KEY)
    }
  }, [token])

  /**
   * Call after a successful /auth/login response.
   * @param {string} accessToken  — the JWT string
   */
  const login = useCallback((accessToken) => {
    const payload = decodeJwtPayload(accessToken)
    if (!payload) return
    setToken(accessToken)
    setUser({
      user_id: payload.sub,
      role: payload.role,
      university_id: payload.university_id,
    })
  }, [])

  /** Clear all auth state — effectively logs the user out. */
  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Convenience hook — use inside any component that needs auth state. */
export function useAuth() {
  return useContext(AuthContext)
}
