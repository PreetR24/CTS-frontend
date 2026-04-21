import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import {
  LayoutDashboard,
  Building2,
  Users,
  Activity,
  Settings,
  BarChart3,
  Calendar,
} from "lucide-react";

export default function AdminLayout() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Building2, label: "Sites", path: "/admin/sites" },
    { icon: Building2, label: "Rooms", path: "/admin/rooms" },
    { icon: Users, label: "Providers", path: "/admin/providers" },
    { icon: Activity, label: "Services", path: "/admin/services" },
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Calendar, label: "Holidays", path: "/admin/holidays" },
    { icon: Settings, label: "Configuration", path: "/admin/config" },
    { icon: Settings, label: "Audit", path: "/admin/audit" },
    { icon: BarChart3, label: "Reports", path: "/admin/reports" },
  ];

  return (
    <div className="admin-portal flex h-screen bg-background">
      <Sidebar items={sidebarItems} roleColor="bg-gradient-to-r from-[#a68fcf] to-[#9478bf]" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Admin Portal" userName="Vikram Singh" userRole="Administrator" enableProfileEdit />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}