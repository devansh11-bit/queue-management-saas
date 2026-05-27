import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

function ProtectedRoute({ children, allowedRoles = null, redirectTo = null }) {
  const location = useLocation();
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <p className="muted-text">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.includes(role || "customer");

    if (!isAllowed) {
      const target =
        redirectTo ||
        (role === "admin" ? "/admin" : "/home");

      return <Navigate to={target} replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
