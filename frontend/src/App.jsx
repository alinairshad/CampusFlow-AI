import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages (stubs — implemented per stage)
// import LoginPage from './pages/LoginPage'
// import RegisterPage from './pages/RegisterPage'
// import StudentDashboard from './pages/StudentDashboard'
// import AdminDashboard from './pages/AdminDashboard'
// import AssistantPage from './pages/AssistantPage'
// import ApplicationsPage from './pages/ApplicationsPage'
// import DirectoryPage from './pages/DirectoryPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Placeholder root — replaced in Stage 1 with auth routing */}
        <Route
          path="/"
          element={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-indigo-600">CampusFlow AI</h1>
                <p className="mt-2 text-gray-500">Stage 0 setup complete. Implementation begins at Stage 1.</p>
              </div>
            </div>
          }
        />
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
