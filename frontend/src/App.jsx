import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import StudentDashboardPlaceholder from './pages/StudentDashboardPlaceholder'
import AdminDashboardPlaceholder from './pages/AdminDashboardPlaceholder'
import ChatPage from './features/assistant/ChatPage'
import ApplicationPage from './features/applications/ApplicationPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Student-only routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboardPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute requiredRole="student">
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute requiredRole="student">
                <ApplicationPage />
              </ProtectedRoute>
            }
          />

          {/* Admin-only routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboardPlaceholder />
              </ProtectedRoute>
            }
          />

          {/* Root → /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch-all → /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
