// src/api/axios.ts
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5159";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Handle auth failures globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 => token/session invalid, force logout.
    // 403 => role forbidden for endpoint; do NOT logout globally.
    if (err.response?.status === 401) {
      localStorage.removeItem("authToken");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default api;