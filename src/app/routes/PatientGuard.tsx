import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

const PatientGuard = () => {
  const { role, landingPage, loading } = useAuth();

  if (loading) return null;

  if (role !== "Patient") {
    return <Navigate to={landingPage ?? "/"} replace />;
  }

  return <Outlet />;
};

export default PatientGuard;