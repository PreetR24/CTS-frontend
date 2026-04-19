import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  ClipboardList,
  Users,
  LogOut,
} from "lucide-react";

export default function ProviderLayout() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/provider" },
    { icon: Calendar, label: "My Schedule", path: "/provider/schedule" },
    { icon: Clock, label: "Availability", path: "/provider/availability" },
    { icon: ClipboardList, label: "Appointments", path: "/provider/appointments" },
    { icon: Users, label: "My Patients", path: "/provider/patients" },
    { icon: LogOut, label: "Leave Requests", path: "/provider/leave" },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar items={sidebarItems} roleColor="bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1]" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Provider Portal" userName="Dr. Rajesh Kumar" userRole="Cardiologist" />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}