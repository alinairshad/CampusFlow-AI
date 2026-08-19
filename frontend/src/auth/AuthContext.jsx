/**
 * AuthContext — provides auth state (user, token, login, logout) app-wide.
 * Fully implemented in Stage 1.
 */
import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// AuthProvider implemented in Stage 1
