import { useQuery } from "@tanstack/react-query";
import { Server, Play, AlertTriangle, BarChart2, CheckCircle, XCircle } from "lucide-react";
import { conductorApi, ConductorRun } from "@/api/conductor";
import { useConductorStatus } from "@/hooks/useConductorStatus";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function runTypeLabel(type: ConductorRun["run_type"]) {
  const map: Record<ConductorRun["run_type"], string> = {
    full_pipeline: "Full Pipeline",
    validate_only: "Validate Only",
    collect_only: "Collect Only",
    review_only: "Review Only",
    report_only: "Report Only",
  };
  return map[type] ?? type;
}

// ─── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConductorRun["status"] }) {
  const config: Record<
    ConductorRun["status"],
    { label: string; className: string; pulse?: boolean }
  > = {
    pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
    running: {
      label: "Running",
      className: "bg-blue-100 text-blue-700",
      pulse: true,
    },
    completed: { label: "Completed", className: "bg-green-100 text-green-700" },
    failed: { label: "Failed", className: "bg-red-100 text-red-700" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
    completed_with_warnings: {
      label: "With Warnings",
      className: "bg-yellow-100 text-yellow-700",
    },
  };

  const cfg = config[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
    >
      {cfg.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ value, animated }: { value: number; animated?: boolean }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full ${animated ? "animate-pulse bg-blue-500" : "bg-blue-500"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function ConductorOverview() {
  const { enabled, ollamaHealthy, isLoading: statusLoading } = useConductorStatus();

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ["conductor-runs"],
    queryFn: () => conductorApi.getRuns({ page_size: 20 }),
    refetchInterval: 5_000,
  });

  const { data: findingsData } = useQuery({
    queryKey: ["conductor-findings-overview"],
    queryFn: () => conductorApi.getFindings({ status: "open", page_size: 1 }),
    refetchInterval: 30_000,
  });

  const runs = runsData?.results ?? [];
  const totalRuns = runsData?.count ?? 0;
  const openFindings = findingsData?.count ?? 0;

  const completedRuns = runs.filter(
    (r) => r.status === "completed" || r.status === "completed_with_warnings"
  );
  const avgScore =
    completedRuns.length > 0
      ? Math.round(
          completedRuns.reduce((acc, r) => acc + (r.compliance_score ?? 0), 0) /
            completedRuns.length
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Automation</h1>
          <p className="text-gray-500 mt-0.5">
            Conductor — automated compliance analysis and evidence collection
          </p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ollama status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div
            className={`p-3 rounded-lg ${
              statusLoading ? "bg-gray-300" : ollamaHealthy ? "bg-green-500" : "bg-red-500"
            }`}
          >
            <Server className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {statusLoading ? "…" : ollamaHealthy ? "Online" : "Offline"}
            </p>
            <p className="text-sm text-gray-500">Ollama Status</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {enabled ? "Conductor enabled" : "Conductor disabled"}
            </p>
          </div>
          {!statusLoading && (
            <div className="ml-auto">
              {ollamaHealthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
        </div>

        <StatCard
          label="Total Runs"
          value={runsLoading ? "…" : totalRuns}
          icon={Play}
          color="bg-blue-500"
        />
        <StatCard
          label="Open Findings"
          value={openFindings}
          icon={AlertTriangle}
          color="bg-orange-500"
        />
        <StatCard
          label="Avg Compliance Score"
          value={avgScore !== null ? `${avgScore}%` : "N/A"}
          icon={BarChart2}
          color="bg-indigo-500"
          sub={
            completedRuns.length > 0
              ? `based on ${completedRuns.length} run${completedRuns.length > 1 ? "s" : ""}`
              : "no completed runs"
          }
        />
      </div>

      {/* Recent runs table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Runs</h2>
        </div>

        {runsLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : runs.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Play className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm">No runs yet. Launch your first AI run from the Agents tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Framework</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium w-40">Progress</th>
                  <th className="px-6 py-3 font-medium">Score</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {runTypeLabel(run.run_type)}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {run.framework_name ?? run.framework ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={run.progress}
                          animated={run.status === "running"}
                        />
                        <span className="text-xs text-gray-400 shrink-0 w-8 text-right">
                          {run.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-800">
                      {run.compliance_score != null ? `${run.compliance_score}%` : "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
