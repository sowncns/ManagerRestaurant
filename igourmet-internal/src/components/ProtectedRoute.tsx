import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types/auth'

export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { staff, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Đang tải...
      </div>
    )
  }

  if (status === 'unauthenticated' || !staff) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(staff.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
