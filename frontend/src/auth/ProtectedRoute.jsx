/**
 * ProtectedRoute — guards a route by token presence and optional role.
 *
 * Props:
 *   requiredRole  (optional) — "student" | "admin"
 *                 If omitted, any authenticated user can access.
 *
 * Behaviour:
 *   - No token               → redirect to /login
 *   - Wrong role             → redirect to /unauthorized
 *   - Correct / no role req  → render children
 *
 * NOTE: This is a UX guard only. The backend enforces authorization
 * authoritatively on every request.
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { token, user } = useAuth()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
