// src/routes/routes.tsx
import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/Login";
import AuthGuard from "./AuthGuard";
import AdminGuard from "./AdminGuard";
import ProviderGuard from "./ProviderGuard";
import PatientGuard from "./PatientGuard";
import FrontDeskGuard from "./FrontDeskGuard";
import NurseGuard from "./NurseGuard";
import OperationsGuard from "./OperationsGuard";

// Layouts
import AdminLayout from "../layouts/AdminLayout";
import ProviderLayout from "../layouts/ProviderLayout";
import FrontDeskLayout from "../layouts/FrontDeskLayout";
import StaffLayout from "../layouts/StaffLayout";
import PatientLayout from "../layouts/PatientLayout";
import OperationsLayout from "../layouts/OperationsLayout";

// Admin Pages
import AdminDashboard from "../pages/admin/Dashboard";
import AdminSites from "../pages/admin/Sites";
import AdminRooms from "../pages/admin/Rooms";
import AdminProviders from "../pages/admin/Providers";
import AdminServices from "../pages/admin/Services";
import AdminUsers from "../pages/admin/Users";
import AdminHolidays from "../pages/admin/Holidays";
import AdminConfig from "../pages/admin/Config";
import AdminAudit from "../pages/admin/Audit";
import AdminReports from "../pages/admin/Reports";

// Provider Pages
import ProviderDashboard from "../pages/provider/Dashboard";
import ProviderSchedule from "../pages/provider/Schedule";
import ProviderAvailability from "../pages/provider/Availability";
import ProviderAppointments from "../pages/provider/Appointments";
import ProviderPatients from "../pages/provider/Patients";
import ProviderLeave from "../pages/provider/Leave";

// FrontDesk Pages
import FrontDeskDashboard from "../pages/frontdesk/Dashboard";
import FrontDeskBooking from "../pages/frontdesk/Booking";
import FrontDeskCheckIn from "../pages/frontdesk/CheckIn";
import FrontDeskQueue from "../pages/frontdesk/Queue";
import FrontDeskSearch from "../pages/frontdesk/Search";
import FrontDeskWaitlist from "../pages/frontdesk/Waitlist";

// Staff Pages
import StaffDashboard from "../pages/staff/Dashboard";
import StaffSchedule from "../pages/staff/Schedule";
import StaffPatients from "../pages/staff/Patients";
import StaffRooms from "../pages/staff/Rooms";
import StaffTasks from "../pages/staff/Tasks";

// Patient Pages
import PatientDashboard from "../pages/patient/Dashboard";
import PatientAppointments from "../pages/patient/Appointments";
import PatientRecords from "../pages/patient/Records";
import PatientProfile from "../pages/patient/Profile";
import PatientPrescriptions from "../pages/patient/Prescriptions";
import PatientDoctors from "../pages/patient/Doctors";

// Operations Pages
import OperationsDashboard from "../pages/operations/Dashboard";
import OperationsRoster from "../pages/operations/Roster";
import OperationsLeave from "../pages/operations/Leave";
import OperationsStaffing from "../pages/operations/Staffing";
import OperationsAnalytics from "../pages/operations/Analytics";
import OperationsOnCall from "../pages/operations/OnCall";

export const router = createBrowserRouter([
  // ✅ PUBLIC
  {
    path: "/",
    Component: Login,
  },

  // ✅ AUTHENTICATED
  {
    Component: AuthGuard,
    children: [
      // ✅ ADMIN
      {
        Component: AdminGuard,
        children: [
          {
            path: "/admin",
            Component: AdminLayout,
            children: [
              { index: true, Component: AdminDashboard },
              { path: "sites", Component: AdminSites },
              { path: "rooms", Component: AdminRooms },
              { path: "providers", Component: AdminProviders },
              { path: "services", Component: AdminServices },
              { path: "users", Component: AdminUsers },
              { path: "holidays", Component: AdminHolidays },
              { path: "config", Component: AdminConfig },
              { path: "audit", Component: AdminAudit },
              { path: "reports", Component: AdminReports },
            ],
          },
        ],
      },

      // ✅ PROVIDER
      {
        Component: ProviderGuard,
        children: [
          {
            path: "/provider",
            Component: ProviderLayout,
            children: [
              { index: true, Component: ProviderDashboard },
              { path: "schedule", Component: ProviderSchedule },
              { path: "availability", Component: ProviderAvailability },
              { path: "appointments", Component: ProviderAppointments },
              { path: "patients", Component: ProviderPatients },
              { path: "leave", Component: ProviderLeave },
            ],
          },
        ],
      },

      // ✅ FRONTDESK
      {
        Component: FrontDeskGuard,
        children: [
          {
            path: "/frontdesk",
            Component: FrontDeskLayout,
            children: [
              { index: true, Component: FrontDeskDashboard },
              { path: "appointments", Component: FrontDeskBooking },
              { path: "checkin", Component: FrontDeskCheckIn },
              { path: "waitlist", Component: FrontDeskWaitlist },
              { path: "rooms", Component: FrontDeskQueue },
              { path: "search", Component: FrontDeskSearch },
            ],
          },
        ],
      },

      // ✅ STAFF / NURSE
      {
        Component: NurseGuard,
        children: [
          {
            path: "/staff",
            Component: StaffLayout,
            children: [
              { index: true, Component: StaffDashboard },
              { path: "schedule", Component: StaffSchedule },
              { path: "queue", Component: StaffPatients },
              { path: "rooms", Component: StaffRooms },
              { path: "tasks", Component: StaffTasks },
            ],
          },
        ],
      },

      // ✅ PATIENT
      {
        Component: PatientGuard,
        children: [
          {
            path: "/patient",
            Component: PatientLayout,
            children: [
              { index: true, Component: PatientDashboard },
              { path: "doctors", Component: PatientDoctors },
              { path: "book", Component: PatientAppointments },
              { path: "appointments", Component: PatientAppointments },
              { path: "records", Component: PatientRecords },
              { path: "prescriptions", Component: PatientPrescriptions },
              { path: "profile", Component: PatientProfile },
            ],
          },
        ],
      },

      // ✅ OPERATIONS
      {
        Component: OperationsGuard,
        children: [
          {
            path: "/operations",
            Component: OperationsLayout,
            children: [
              { index: true, Component: OperationsDashboard },
              { path: "roster", Component: OperationsRoster },
              { path: "leave", Component: OperationsLeave },
              { path: "oncall", Component: OperationsOnCall },
              { path: "capacity", Component: OperationsStaffing },
              { path: "analytics", Component: OperationsAnalytics },
            ],
          },
        ],
      },
    ],
  },
]);
