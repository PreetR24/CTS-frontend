import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  User,
} from "lucide-react";

export default function PatientLayout() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/patient" },
    { icon: Calendar, label: "My Appointments", path: "/patient/appointments" },
    { icon: FileText, label: "Medical Records", path: "/patient/records" },
    { icon: Pill, label: "Prescriptions", path: "/patient/prescriptions" },
    { icon: User, label: "My Profile", path: "/patient/profile" },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar items={sidebarItems} roleColor="bg-gradient-to-r from-[#f5a8c8] to-[#e898b8]" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Patient Portal" userName="Anjali Mehta" userRole="Patient" />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}