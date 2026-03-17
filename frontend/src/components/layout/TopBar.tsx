import { Bell, CheckCheck, LogOut, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/api/notifications";
import { useAuthStore } from "@/store/authStore";

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { data: notifications = [] } = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = notifications.filter((n) => !n.is_read);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-lg shadow-lg z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">
          Notifications
          {unread.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs bg-destructive text-destructive-foreground rounded-full">
              {unread.length}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {unread.length > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y">
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors ${
                !n.is_read ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.is_read ? "font-medium" : ""}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {n.body}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markOne.mutate(n.id)}
                  className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                  title="Mark as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [panelOpen]);

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div ref={containerRef} className="relative">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="relative p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </button>
          {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-xs">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="font-medium leading-none">{user?.display_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role?.replace("_", " ")}
            </p>
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
