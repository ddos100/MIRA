import { useState } from "react";
import { Plus, Trash2, BarChart2, PieChart, Hash, AlignLeft, TrendingUp } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/api/client";

// ─── Types ──────────────────────────────────────────────────────────────────

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

const WIDGET_TYPES = [
  { value: "counter", label: "Counter", icon: Hash, description: "Show a single numeric KPI" },
  { value: "bar_chart", label: "Bar Chart", icon: BarChart2, description: "Compare values across categories" },
  { value: "pie_chart", label: "Pie Chart", icon: PieChart, description: "Show proportional breakdown" },
  { value: "line_chart", label: "Line Chart", icon: TrendingUp, description: "Track values over time" },
  { value: "text", label: "Text", icon: AlignLeft, description: "Display static text or notes" },
];

const DATA_SOURCES = [
  { value: "risk_by_status", label: "Risks by Status" },
  { value: "risk_by_rating", label: "Risks by Rating" },
  { value: "control_by_status", label: "Controls by Status" },
  { value: "control_by_type", label: "Controls by Type" },
  { value: "incident_by_severity", label: "Incidents by Severity" },
  { value: "incident_by_status", label: "Incidents by Status" },
  { value: "compliance_gap", label: "Compliance Gaps" },
  { value: "exception_by_status", label: "Exceptions by Status" },
  { value: "policy_by_status", label: "Policies by Status" },
  { value: "asset_by_criticality", label: "Assets by Criticality" },
  { value: "open_risks_count", label: "Open Risks (Count)" },
  { value: "open_incidents_count", label: "Open Incidents (Count)" },
  { value: "active_controls_count", label: "Active Controls (Count)" },
  { value: "pending_exceptions_count", label: "Pending Exceptions (Count)" },
];

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useDashboards() {
  return useQuery<Dashboard[]>({
    queryKey: ["dashboards"],
    queryFn: () =>
      apiClient.get("/reports/dashboards/", { params: { page_size: 50 } })
        .then((r) => r.data?.results ?? r.data ?? []),
  });
}

function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; is_default?: boolean }) =>
      apiClient.post("/reports/dashboards/", data).then((r) => r.data as Dashboard),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      qc.invalidateQueries({ queryKey: ["default-dashboard"] });
    },
  });
}

function useCreateWidget(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Widget, "id">) =>
      apiClient.post("/reports/widgets/", { ...data, dashboard: dashboardId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      qc.invalidateQueries({ queryKey: ["default-dashboard"] });
    },
  });
}

function useDeleteWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/reports/widgets/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      qc.invalidateQueries({ queryKey: ["default-dashboard"] });
    },
  });
}

// ─── Add Widget Form ─────────────────────────────────────────────────────────

interface AddWidgetFormProps {
  dashboardId: string;
  onAdded: () => void;
}

function AddWidgetForm({ dashboardId, onAdded }: AddWidgetFormProps) {
  const [title, setTitle] = useState("");
  const [widgetType, setWidgetType] = useState("counter");
  const [dataSource, setDataSource] = useState("open_risks_count");
  const createWidget = useCreateWidget(dashboardId);

  async function handleAdd() {
    if (!title.trim()) return;
    await createWidget.mutateAsync({
      title: title.trim(),
      widget_type: widgetType,
      grid_x: 0,
      grid_y: 99,
      grid_w: 4,
      grid_h: 3,
      config: { data_source: dataSource },
    });
    setTitle("");
    onAdded();
  }

  return (
    <div className="rounded-lg border border-dashed border-primary/40 p-4 space-y-3 bg-primary/5">
      <p className="text-sm font-medium">Add New Widget</p>

      <Input
        placeholder="Widget title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        {WIDGET_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setWidgetType(t.value)}
              className={`flex items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors ${
                widgetType === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Data Source</label>
        <select
          value={dataSource}
          onChange={(e) => setDataSource(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {DATA_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <Button
        onClick={handleAdd}
        disabled={!title.trim() || createWidget.isPending}
        className="w-full"
      >
        <Plus className="h-4 w-4" />
        {createWidget.isPending ? "Adding…" : "Add Widget"}
      </Button>
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WidgetBuilderModal({ open, onClose }: Props) {
  const { data: dashboards = [], isLoading } = useDashboards();
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>("");
  const [newDashboardName, setNewDashboardName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const createDashboard = useCreateDashboard();
  const deleteWidget = useDeleteWidget();

  const dashboard = dashboards.find((d) => d.id === selectedDashboardId)
    ?? dashboards.find((d) => d.is_default)
    ?? dashboards[0];

  const activeDashboardId = selectedDashboardId || dashboard?.id || "";

  async function handleCreateDashboard() {
    if (!newDashboardName.trim()) return;
    const created = await createDashboard.mutateAsync({
      name: newDashboardName.trim(),
      is_default: dashboards.length === 0,
    });
    setSelectedDashboardId(created.id);
    setNewDashboardName("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Widget Builder" size="xl">
      <div className="space-y-4">
        {/* Dashboard selector */}
        <div className="flex items-center gap-2">
          <select
            value={activeDashboardId}
            onChange={(e) => setSelectedDashboardId(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          >
            {dashboards.length === 0 && <option value="">No dashboards yet</option>}
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Create new dashboard */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="New dashboard name…"
            value={newDashboardName}
            onChange={(e) => setNewDashboardName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateDashboard(); }}
          />
          <Button
            variant="outline"
            onClick={handleCreateDashboard}
            disabled={!newDashboardName.trim() || createDashboard.isPending}
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        {/* Widget list */}
        {dashboard && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Widgets on "{dashboard.name}" ({(dashboard.widgets ?? []).length})
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm((v) => !v)}
              >
                <Plus className="h-4 w-4" />
                {showAddForm ? "Cancel" : "Add Widget"}
              </Button>
            </div>

            {showAddForm && (
              <AddWidgetForm
                dashboardId={activeDashboardId}
                onAdded={() => setShowAddForm(false)}
              />
            )}

            {(dashboard.widgets ?? []).length === 0 && !showAddForm && (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No widgets yet. Click "Add Widget" to get started.
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {[...(dashboard.widgets ?? [])]
                .sort((a, b) => a.grid_y - b.grid_y || a.grid_x - b.grid_x)
                .map((widget) => {
                  const wt = WIDGET_TYPES.find((t) => t.value === widget.widget_type);
                  const Icon = wt?.icon ?? Hash;
                  return (
                    <div
                      key={widget.id}
                      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{widget.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {wt?.label ?? widget.widget_type}
                          {widget.config.data_source
                            ? ` · ${DATA_SOURCES.find((s) => s.value === widget.config.data_source)?.label ?? widget.config.data_source}`
                            : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteWidget.mutate(widget.id)}
                        disabled={deleteWidget.isPending}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Remove widget"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
