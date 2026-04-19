import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

const NurseGuard = () => {
  const { role, landingPage, loading } = useAuth();

  if (loading) return null;

  if (role !== "Nurse" && role !== "Tech") {
    return <Navigate to={landingPage ?? "/"} replace />;
  }

  return <Outlet />;
};

export default NurseGuard;