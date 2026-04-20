import axios from "axios";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5159";

const roleCredentials = [
  { role: "Admin", email: "admin@care.com" },
  { role: "Provider", email: "doctor@care.com" },
  { role: "Patient", email: "patient@care.com" },
  { role: "FrontDesk", email: "frontdesk@care.com" },
  { role: "Nurse", email: "nurse@care.com" },
  { role: "Operations", email: "operations@care.com" },
];

// Emulates frontend interceptor behavior without a browser runtime.
const localStorageMock = {
  _store: new Map(),
  getItem(key) {
    return this._store.has(key) ? this._store.get(key) : null;
  },
  setItem(key, value) {
    this._store.set(key, String(value));
  },
  removeItem(key) {
    this._store.delete(key);
  },
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorageMock.getItem("authToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const loginClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

const endpointTests = [
  // authApi.ts
  { key: "auth.me", method: "GET", url: "/auth/me" },
  { key: "auth.logout", method: "POST", url: "/auth/logout", data: {} },

  // masterdataApi.ts
  { key: "master.sites", method: "GET", url: "/api/masterdata/sites" },
  { key: "master.services", method: "GET", url: "/api/masterdata/services" },
  { key: "master.providers", method: "GET", url: "/api/masterdata/providers" },
  { key: "master.rooms", method: "GET", url: "/api/masterdata/rooms" },
  { key: "master.providerServices", method: "GET", url: "/api/masterdata/providers/1/services" },

  // usersApi.ts
  { key: "users.search", method: "GET", url: "/api/iam/users" },

  // appointmentsApi.ts
  { key: "appointments.search", method: "GET", url: "/appointments" },
  { key: "appointments.checkedIn", method: "PATCH", url: "/appointments/9999/checked-in", data: {} },
  { key: "appointments.cancel", method: "PATCH", url: "/appointments/9999/cancel", data: { reason: "auth-matrix-test" } },
  { key: "waitlist.search", method: "GET", url: "/waitlist" },

  // operationsApi.ts
  { key: "operations.rosters", method: "GET", url: "/rosters" },
  { key: "operations.leave.search", method: "GET", url: "/leave" },
  { key: "operations.leave.approve", method: "PATCH", url: "/leave/9999/approve" },
  { key: "operations.leave.reject", method: "PATCH", url: "/leave/9999/reject" },
  { key: "operations.oncall", method: "GET", url: "/oncall" },
  { key: "operations.rosterAssignments", method: "GET", url: "/roster-assignments" },

  // reportsApi.ts
  { key: "reports.search", method: "GET", url: "/reports" },
];

function classify(status) {
  if (status >= 200 && status < 300) return "ALLOWED";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status >= 500) return "SERVER_ERROR";
  return "FAILED";
}

async function run() {
  const matrix = [];

  for (const cred of roleCredentials) {
    const loginBody = { email: cred.email, role: cred.role };
    let token = null;
    let loginStatus = 0;

    try {
      const loginResp = await loginClient.post("/auth/login", loginBody);
      loginStatus = loginResp.status;
      token = loginResp.data?.data?.token ?? null;
    } catch (error) {
      loginStatus = error?.response?.status ?? 0;
    }

    matrix.push({
      role: cred.role,
      endpoint: "auth.login",
      method: "POST",
      status: loginStatus,
      result: classify(loginStatus),
    });

    if (!token) {
      continue;
    }

    localStorageMock.setItem("authToken", token);

    for (const test of endpointTests) {
      try {
        const response = await api.request({
          method: test.method,
          url: test.url,
          data: test.data,
        });

        matrix.push({
          role: cred.role,
          endpoint: test.key,
          method: test.method,
          status: response.status,
          result: classify(response.status),
        });
      } catch (error) {
        const status = error?.response?.status ?? 0;
        matrix.push({
          role: cred.role,
          endpoint: test.key,
          method: test.method,
          status,
          result: classify(status),
        });
      }
    }

    localStorageMock.removeItem("authToken");
  }

  console.table(matrix);

  const failures = matrix.filter((x) => x.result === "SERVER_ERROR" || x.status === 0);
  if (failures.length > 0) {
    console.log("\nPotential backend issues:");
    for (const f of failures) {
      console.log(`${f.role} ${f.method} ${f.endpoint} -> ${f.status}`);
    }
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
