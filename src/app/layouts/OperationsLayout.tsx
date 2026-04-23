import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import {
  LayoutDashboard,
  CalendarClock,
  UserCog,
  Users,
  BarChart3,
  Phone,
} from "lucide-react";

export default function OperationsLayout() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/operations" },
    { icon: CalendarClock, label: "Roster Management", path: "/operations/roster" },
    { icon: UserCog, label: "Leave Management", path: "/operations/leave" },
    { icon: Users, label: "Nurse Workload", path: "/operations/capacity" },
    { icon: BarChart3, label: "Analytics", path: "/operations/analytics" },
    { icon: Phone, label: "On-Call Coverage", path: "/operations/oncall" },
  ];

  return (
    <div className="operations-portal flex h-screen bg-background">
      <Sidebar items={sidebarItems} roleColor="bg-gradient-to-r from-[#b8d4e8] to-[#a8c4d8]" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Operations Portal" enableProfileEdit />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}