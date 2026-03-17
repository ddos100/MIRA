import { Bell, LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/store/authStore";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-xs">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="font-medium leading-none">{user?.display_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
