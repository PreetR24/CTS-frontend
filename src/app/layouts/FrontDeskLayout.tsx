import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import {
  LayoutDashboard,
  Calendar,
  UserPlus,
  ListChecks,
  Users,
  Search,
} from "lucide-react";

export default function FrontDeskLayout() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/frontdesk" },
    { icon: UserPlus, label: "Book Appointment", path: "/frontdesk/appointments" },
    { icon: ListChecks, label: "Check-In", path: "/frontdesk/checkin" },
    { icon: Calendar, label: "Queue Board", path: "/frontdesk/rooms" },
    { icon: Users, label: "Waitlist", path: "/frontdesk/waitlist" },
    { icon: Search, label: "Search Patients", path: "/frontdesk/search" },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar items={sidebarItems} roleColor="bg-gradient-to-r from-[#f0b895] to-[#d89768]" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Front Desk Portal" userName="Amit Patel" userRole="Front Desk Officer" />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}