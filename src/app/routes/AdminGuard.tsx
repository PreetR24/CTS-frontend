import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

const AdminGuard = () => {
  const { role, landingPage, loading } = useAuth();

  if (loading) {
    return <div>Loading admin...</div>; // ✅ DO NOT return null
  }

  if (role !== "Admin") {
    return <Navigate to={landingPage ?? "/"} replace />;
  }

  return <Outlet />;
};

export default AdminGuard;