import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DoorOpen,
} from "lucide-react";

export default function NurseLayout() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/nurse" },
    { icon: Calendar, label: "My Schedule", path: "/nurse/schedule" },
    { icon: Users, label: "Patient Care", path: "/nurse/queue" },
    { icon: DoorOpen, label: "Room Management", path: "/nurse/rooms" },
  ];

  return (
    <div className="nurse-portal flex h-screen bg-background">
      <Sidebar items={sidebarItems} roleColor="bg-gradient-to-r from-[#95d4a8] to-[#75b488]" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Nurse Portal" enableProfileEdit />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}