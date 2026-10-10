import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "./AuthContext"
import type { UserRole } from "./demoAuth"

export default function ProtectedRoute({ role }: { role: UserRole }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        <div className="brand-mark">M</div>
        <span>Verifying your local session…</span>
      </div>
    )
  }
  if (!session) {
    return (
      <Navigate
        to={`/${role}/login`}
        replace
        state={{ from: location.pathname, reason: "signin" }}
      />
    )
  }
  if (session.role !== role) {
    return <Navigate to={`/${session.role}`} replace />
  }
  return <Outlet />
}
