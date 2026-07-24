import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import DigitalBackground from './components/DigitalBackground'
import ProtectedRoute from './components/ProtectedRoute'
import TopBar from './components/TopBar'
import { useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import GeneratorWindow from './pages/GeneratorWindow'
import Packages from './pages/Packages'
import AdminDashboard from './pages/AdminDashboard'
import NotFound from './pages/NotFound'

export default function App() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  // Halaman autentikasi tampil tanpa bilah atas, dan partikelnya dibuat lebih sedikit
  const authPage = ['/login', '/daftar', '/lupa-password'].includes(pathname)

  return (
    <div className="relative min-h-screen">
      <DigitalBackground density={authPage ? 'low' : 'normal'} />
      {user && !authPage && <TopBar />}

      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/daftar" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/lupa-password" element={<ForgotPassword />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/generator/:type" element={<ProtectedRoute><GeneratorWindow /></ProtectedRoute>} />
        <Route path="/paket" element={<ProtectedRoute><Packages /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}
