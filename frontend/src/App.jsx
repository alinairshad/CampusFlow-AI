import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import LandingPage from './pages/LandingPage'
import StudentDashboardPlaceholder from './pages/StudentDashboardPlaceholder'
import AdminDashboardPlaceholder from './pages/AdminDashboardPlaceholder'
import ChatPage from './features/assistant/ChatPage'
import ApplicationPage from './features/applications/ApplicationPage'
import DirectoryPage from './features/directory/DirectoryPage'
import SocietiesPage from './features/directory/SocietiesPage'
import MentorsPage from './features/directory/MentorsPage'

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
          {/* /directory is public data but still requires login for the student context */}
          <Route
            path="/directory"
            element={
              <ProtectedRoute requiredRole="student">
                <DirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/societies"
            element={
              <ProtectedRoute requiredRole="student">
                <SocietiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentors"
            element={
              <ProtectedRoute requiredRole="student">
                <MentorsPage />
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

          {/* Root → landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Catch-all → /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
