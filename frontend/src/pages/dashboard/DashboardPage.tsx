import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckSquare, Lock, ShieldAlert, XCircle } from "lucide-react";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-card border rounded-lg p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const stats = [
    { label: "Open Risks", icon: ShieldAlert, color: "bg-red-500", endpoint: "/risks/?status=open&page_size=1" },
    { label: "Compliance Programs", icon: CheckSquare, color: "bg-blue-500", endpoint: "/compliance/?page_size=1" },
    { label: "Active Controls", icon: Lock, color: "bg-green-500", endpoint: "/controls/?status=active&page_size=1" },
    { label: "Open Incidents", icon: AlertTriangle, color: "bg-orange-500", endpoint: "/incidents/?status=new&page_size=1" },
    { label: "Open Exceptions", icon: XCircle, color: "bg-purple-500", endpoint: "/exceptions/?status=pending&page_size=1" },
  ];

  const queries = stats.map((s) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["dashboard-stat", s.endpoint],
      queryFn: () => apiClient.get(s.endpoint).then((r) => r.data?.count ?? 0),
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.display_name}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={queries[i].isLoading ? "…" : (queries[i].data ?? 0)}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-5">
          <h3 className="font-semibold mb-4">Recent Risks</h3>
          <p className="text-sm text-muted-foreground">Risk heat-map and recent items will render here.</p>
        </div>
        <div className="bg-card border rounded-lg p-5">
          <h3 className="font-semibold mb-4">Compliance Overview</h3>
          <p className="text-sm text-muted-foreground">Compliance progress charts will render here.</p>
        </div>
      </div>
    </div>
  );
}
