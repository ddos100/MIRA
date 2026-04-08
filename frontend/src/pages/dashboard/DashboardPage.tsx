import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckSquare, Lock, ShieldAlert, XCircle, LayoutDashboard, RefreshCw, Settings2 } from "lucide-react";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { WidgetBuilderModal } from "@/components/dashboard/WidgetBuilderModal";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WidgetData {
  widget_type: string;
  value?: number;
  labels?: string[];
  data?: number[];
  text?: string;
  error?: string;
}

interface Widget {
  id: string;
  title: string;
  widget_type: string;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  config: Record<string, unknown>;
}

interface Dashboard {
  id: string;
  name: string;
  is_default: boolean;
  widgets: Widget[];
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

function useDefaultDashboard() {
  return useQuery<Dashboard | null>({
    queryKey: ["default-dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get("/reports/dashboards/", {
        params: { page_size: 10 },
      });
      const list: Dashboard[] = data.results ?? data;
      const found = list.find((d) => d.is_default) ?? list[0] ?? null;
      if (found) found.widgets = found.widgets ?? [];
      return found;
    },
    staleTime: 60_000,
  });
}

function useWidgetData(widgetId: string) {
  return useQuery<WidgetData>({
    queryKey: ["widget-data", widgetId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/reports/widgets/${widgetId}/data/`);
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ─── Widget renderers ──────────────────────────────────────────────────────────

function CounterWidget({ widgetData }: { widgetData: WidgetData | undefined }) {
  const value = widgetData?.value ?? "—";
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-5xl font-bold text-blue-600">{value}</p>
    </div>
  );
}

function BarChartWidget({ widgetData }: { widgetData: WidgetData | undefined }) {
  if (!widgetData?.labels?.length) {
    return <p className="text-sm text-muted-foreground text-center pt-4">No data</p>;
  }
  const maxVal = Math.max(...widgetData.data!.map(Number), 1);
  return (
    <div className="flex items-end gap-1 h-full px-2 pb-2">
      {widgetData.labels.map((label, i) => {
        const pct = ((widgetData.data![i] ?? 0) / maxVal) * 100;
        const colors = [
          "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500",
          "bg-red-500", "bg-teal-500", "bg-yellow-500", "bg-pink-500",
        ];
        return (
          <div key={label} className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-xs font-medium mb-0.5">{widgetData.data![i]}</span>
            <div
              className={cn("w-full rounded-t transition-all", colors[i % colors.length])}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-0.5">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PieChartWidget({ widgetData }: { widgetData: WidgetData | undefined }) {
  if (!widgetData?.labels?.length) {
    return <p className="text-sm text-muted-foreground text-center pt-4">No data</p>;
  }
  const colors = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#14b8a6", "#eab308"];
  const total = widgetData.data!.reduce((a, b) => a + Number(b), 0) || 1;

  return (
    <div className="flex items-center gap-3 h-full px-2">
      <div className="shrink-0">
        <svg viewBox="0 0 36 36" className="w-20 h-20">
          {(() => {
            let offset = 0;
            return widgetData.labels!.map((label, i) => {
              const pct = (Number(widgetData.data![i]) / total) * 100;
              const dash = `${pct} ${100 - pct}`;
              const rotate = `rotate(${offset * 3.6 - 90} 18 18)`;
              offset += pct;
              return (
                <circle
                  key={label}
                  cx="18" cy="18" r="15.9155"
                  fill="transparent"
                  stroke={colors[i % colors.length]}
                  strokeWidth="4"
                  strokeDasharray={dash}
                  strokeDashoffset="0"
                  transform={rotate}
                />
              );
            });
          })()}
        </svg>
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        {widgetData.labels!.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="truncate text-muted-foreground">{label}</span>
            <span className="ml-auto font-medium">{widgetData.data![i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextWidget({ widgetData }: { widgetData: WidgetData | undefined }) {
  return (
    <p className="text-sm text-muted-foreground leading-relaxed">
      {widgetData?.text ?? "No content."}
    </p>
  );
}

// ─── Widget card ───────────────────────────────────────────────────────────────

function WidgetCard({ widget }: { widget: Widget }) {
  const { data: widgetData, isLoading } = useWidgetData(widget.id);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      );
    }
    if (widgetData?.error) {
      return <p className="text-xs text-red-500 text-center pt-4">{widgetData.error}</p>;
    }
    switch (widget.widget_type) {
      case "counter": return <CounterWidget widgetData={widgetData} />;
      case "bar_chart":
      case "stacked_bar": return <BarChartWidget widgetData={widgetData} />;
      case "pie_chart": return <PieChartWidget widgetData={widgetData} />;
      case "text": return <TextWidget widgetData={widgetData} />;
      default: return <BarChartWidget widgetData={widgetData} />;
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 flex flex-col" style={{ minHeight: 180 }}>
      <p className="text-sm font-semibold mb-3 text-gray-700">{widget.title}</p>
      <div className="flex-1">{renderContent()}</div>
    </div>
  );
}

// ─── Static stats ──────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
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

function useCount(endpoint: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: ["dash-count", endpoint, params],
    queryFn: () =>
      apiClient.get(endpoint, { params: { page_size: 1, ...params } }).then((r) => r.data?.count ?? 0),
    staleTime: 30_000,
  });
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [showWidgets, setShowWidgets] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);

  const { data: dashboard, isLoading: dashLoading, refetch } = useDefaultDashboard();

  const { data: openRisks = 0 } = useCount("/risks/risks/", { status: "open" });
  const { data: openIncidents = 0 } = useCount("/incidents/incidents/", { status: "new" });
  const { data: activeControls = 0 } = useCount("/controls/controls/", { status: "active" });
  const { data: pendingExceptions = 0 } = useCount("/exceptions/exceptions/", { status: "pending" });
  const { data: compliancePrograms = 0 } = useCount("/compliance/programs/");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.display_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBuilderOpen(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border hover:border-gray-400"
          >
            <Settings2 size={14} />
            Manage Widgets
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border hover:border-gray-400"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Open Risks" value={openRisks as number} icon={ShieldAlert} color="bg-red-500" />
        <StatCard label="Compliance Programs" value={compliancePrograms as number} icon={CheckSquare} color="bg-blue-500" />
        <StatCard label="Active Controls" value={activeControls as number} icon={Lock} color="bg-green-500" />
        <StatCard label="Open Incidents" value={openIncidents as number} icon={AlertTriangle} color="bg-orange-500" />
        <StatCard label="Pending Exceptions" value={pendingExceptions as number} icon={XCircle} color="bg-purple-500" />
      </div>

      {/* Widget grid from saved dashboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <LayoutDashboard size={16} />
            {dashboard?.name ?? "My Dashboard"}
          </h2>
          <button
            onClick={() => setShowWidgets((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showWidgets ? "Hide widgets" : "Show widgets"}
          </button>
        </div>

        {showWidgets && (
          <>
            {dashLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card border rounded-lg p-4 h-44 animate-pulse" />
                ))}
              </div>
            )}

            {!dashLoading && dashboard && (dashboard.widgets?.length ?? 0) > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...(dashboard.widgets ?? [])]
                  .sort((a, b) => a.grid_y - b.grid_y || a.grid_x - b.grid_x)
                  .map((widget) => (
                    <WidgetCard key={widget.id} widget={widget} />
                  ))}
              </div>
            )}

            {!dashLoading && (!dashboard || (dashboard.widgets?.length ?? 0) === 0) && (
              <div className="bg-card border rounded-lg p-10 text-center">
                <LayoutDashboard className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-sm text-muted-foreground">
                  No widgets configured. Create a dashboard in{" "}
                  <a href="/reports" className="text-blue-600 hover:underline">
                    Reports
                  </a>{" "}
                  to add live widgets here.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <WidgetBuilderModal open={builderOpen} onClose={() => { setBuilderOpen(false); refetch(); }} />
    </div>
  );
}
