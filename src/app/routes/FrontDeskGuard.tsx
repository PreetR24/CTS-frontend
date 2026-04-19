import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

const FrontDeskGuard = () => {
  const { role, landingPage, loading } = useAuth();

  if (loading) return null;

  if (role !== "Frontdesk") {
    return <Navigate to={landingPage ?? "/"} replace />;
  }

  return <Outlet />;
};

export default FrontDeskGuard;