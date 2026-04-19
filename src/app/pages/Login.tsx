import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { loginApi } from "../../api/authApi";
import { useAuth } from "../../api/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { refreshAuth, landingPage, role, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && role && landingPage) {
      navigate(landingPage, { replace: true });
    }
  }, [loading, role, landingPage, navigate]);

  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  const roles = [
    { label: "Admin", path: "/admin" },
    { label: "Provider", path: "/provider" },
    { label: "FrontDesk", path: "/frontdesk" },
    { label: "Nurse", path: "/staff" },
    { label: "Patient", path: "/patient" },
    { label: "Operations", path: "/operations" },
  ];

  const handleLogin = async () => {
    if (!email || !selectedRole) {
      setError("Please select email and role");
      return;
    }

    try {
      setFormLoading(true);
      setError("");

      const data = await loginApi({ email, role: selectedRole });

      if (data.success) {
        // ✅ Save token
        localStorage.setItem("authToken", data.data.token);
        localStorage.setItem("userRole", data.data.role);

        // ✅ Navigate
        await refreshAuth();
        // navigate(landingPage ?? "/", { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-medium text-foreground">CareSchedule</h1>
          <p className="text-sm text-muted-foreground">
            Healthcare Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-base font-medium text-foreground">
            Login
          </h2>

          {/* Email Dropdown */}
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full mt-1 p-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="text-sm text-muted-foreground">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-border bg-background text-sm"
            >
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.label} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={formLoading}
            type="button"
            className="w-full mt-2 p-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            {formLoading ? "Logging in..." : "Login"}
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Demo system • Mock authentication
        </p>
      </div>
    </div>
  );
}