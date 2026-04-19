import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  DoorOpen,
} from "lucide-react";

export default function StaffLayout() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/staff" },
    { icon: Calendar, label: "My Schedule", path: "/staff/schedule" },
    { icon: ClipboardList, label: "My Tasks", path: "/staff/tasks" },
    { icon: Users, label: "Patient Care", path: "/staff/queue" },
    { icon: DoorOpen, label: "Room Management", path: "/staff/rooms" },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar items={sidebarItems} roleColor="bg-gradient-to-r from-[#95d4a8] to-[#75b488]" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Staff Portal" userName="Sneha Reddy" userRole="Nurse" />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}