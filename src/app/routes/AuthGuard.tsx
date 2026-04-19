// src/routes/AuthGuard.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

const AuthGuard = () => {
  const { loading, role } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // ✅ DO NOT return null
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AuthGuard;