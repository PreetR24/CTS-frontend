// src/api/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { meApi, logoutApi } from "./authApi";

interface AuthState {
  role: string | null;
  landingPage: string | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  role: null,
  landingPage: null,
  loading: true,
  refreshAuth: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<string | null>(null);
  const [landingPage, setLandingPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    setLoading(true);
    try {
      const me = await meApi();
      setRole(me.role);
      setLandingPage(me.landingPage);
    } catch {
      setRole(null);
      setLandingPage(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore backend failure
    } finally {
      // ✅ CLEAR EVERYTHING
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");

      setRole(null);
      setLandingPage(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ role, landingPage, loading, refreshAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);