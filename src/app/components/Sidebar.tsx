import { LucideIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface SidebarProps {
  items: SidebarItem[];
  roleColor: string;
}

export function Sidebar({ items, roleColor }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-64 bg-gradient-to-b from-[#faf8f5] to-[#f5f0ea] border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="text-base font-medium text-foreground">CareSchedule</h2>
        <p className="text-xs text-muted-foreground mt-1">Healthcare Management</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? `${roleColor} text-white shadow-sm`
                  : "text-muted-foreground hover:bg-white/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}