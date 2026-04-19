import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

const OperationsGuard = () => {
  const { role, landingPage, loading } = useAuth();

  if (loading) return null;

  if (role !== "Operations") {
    return <Navigate to={landingPage ?? "/"} replace />;
  }

  return <Outlet />;
};

export default OperationsGuard;