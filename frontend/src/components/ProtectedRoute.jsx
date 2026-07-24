import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BootScreen from './BootScreen'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <BootScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}
