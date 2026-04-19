import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";

interface HeaderProps {
  title: string;
  userName: string;
  userRole: string;
}

export function Header({ title, userName, userRole }: HeaderProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();        // ✅ backend + local cleanup
    navigate("/", { replace: true }); // ✅ hard reset
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-medium text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          CareSchedule Management System
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}