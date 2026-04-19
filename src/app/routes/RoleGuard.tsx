// src/routes/RoleGuard.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

interface RoleGuardProps {
  allowedRole: string;
}

const RoleGuard = ({ allowedRole }: RoleGuardProps) => {
    const { role, landingPage, loading } = useAuth();

    if (loading) return null;

    if (role !== allowedRole) {
        return <Navigate to={landingPage ?? "/"} replace />;
    }

    return <Outlet />;
};

export default RoleGuard;