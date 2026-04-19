import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

const ProviderGuard = () => {
  const { role, landingPage, loading } = useAuth();

  if (loading) return null;

  if (role !== "Provider") {
    return <Navigate to={landingPage ?? "/"} replace />;
  }

  return <Outlet />;
};

export default ProviderGuard;