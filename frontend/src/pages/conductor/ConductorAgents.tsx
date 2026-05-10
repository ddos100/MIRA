import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Activity,
} from "lucide-react";
import { conductorApi, ConductorRun, ConductorRunStep } from "@/api/conductor";
import { apiClient } from "@/api/client";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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

function severityColor(sev: string) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-blue-100 text-blue-700",
    info: "bg-gray-100 text-gray-600",
  };
  return colors[sev] ?? "bg-gray-100 text-gray-600";
}

// ─── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConductorRun["status"] }) {
  const config: Record<ConductorRun["status"], { label: string; className: string; pulse?: boolean }> = {
    pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
    running: { label: "Running", className: "bg-blue-100 text-blue-700", pulse: true },
    completed: { label: "Completed", className: "bg-green-100 text-green-700" },
    failed: { label: "Failed", className: "bg-red-100 text-red-700" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
    completed_with_warnings: { label: "With Warnings", className: "bg-yellow-100 text-yellow-700" },
  };
  const cfg = config[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
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

// ─── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ value, animated }: { value: number; animated?: boolean }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${animated ? "animate-pulse bg-blue-500" : "bg-blue-500"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ─── Step accordion ──────────────────────────────────────────────────────────────

function StepRow({ step }: { step: ConductorRunStep }) {
  const [open, setOpen] = useState(false);

  const statusIcon = () => {
    switch (step.status) {
      case "completed": return <CheckCircle size={14} className="text-green-500" />;
      case "failed": return <XCircle size={14} className="text-red-500" />;
      case "running": return <Loader2 size={14} className="animate-spin text-blue-500" />;
      case "skipped": return <ChevronRight size={14} className="text-gray-300" />;
      default: return <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {statusIcon()}
        <span className="flex-1 text-sm font-medium text-gray-700">{step.agent_name}</span>
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {step.input != null && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Input</p>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                {typeof step.input === "string" ? step.input : JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}
          {step.output != null && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Output</p>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                {typeof step.output === "string" ? step.output : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}
          {step.error && (
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase mb-1">Error</p>
              <pre className="text-xs text-red-600 bg-red-50 rounded p-2 overflow-auto max-h-24 whitespace-pre-wrap">
                {step.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SSE hook ────────────────────────────────────────────────────────────────────

function useLiveRun(runId: string | null, onUpdate: (run: ConductorRun) => void) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!runId) return;
    const es = new EventSource(`/api/v1/conductor/runs/${runId}/stream/`);
    esRef.current = es;
    es.addEventListener("run_update", (e) => {
      try {
        const data = JSON.parse(e.data) as ConductorRun;
        onUpdate(data);
      } catch { /* ignore parse errors */ }
    });
    es.onerror = () => es.close();
    return () => { es.close(); esRef.current = null; };
  }, [runId, onUpdate]);
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function ConductorAgents() {
  const qc = useQueryClient();

  // Form state
  const [runType, setRunType] = useState<ConductorRun["run_type"]>("full_pipeline");
  const [frameworkId, setFrameworkId] = useState("");

  // Selected run
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [liveRun, setLiveRun] = useState<ConductorRun | null>(null);

  // Frameworks list
  const { data: frameworksData } = useQuery({
    queryKey: ["compliance-frameworks"],
    queryFn: () => apiClient.get("/compliance/frameworks/", { params: { page_size: 100 } }).then((r) => r.data),
    staleTime: 300_000,
  });
  const frameworks: { id: string; name: string }[] = frameworksData?.results ?? [];

  // Runs list
  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ["conductor-runs"],
    queryFn: () => conductorApi.getRuns({ page_size: 50 }),
    refetchInterval: 5_000,
  });
  const runs: ConductorRun[] = runsData?.results ?? [];

  // Selected run detail
  const { data: selectedRunDetail } = useQuery({
    queryKey: ["conductor-run", selectedRunId],
    queryFn: () => conductorApi.getRun(selectedRunId!),
    enabled: !!selectedRunId,
    refetchInterval: (query) => {
      const run = query.state.data as ConductorRun | undefined;
      return run?.status === "running" ? 3_000 : false;
    },
  });

  const displayRun = liveRun ?? selectedRunDetail ?? null;

  // SSE for live updates
  useLiveRun(
    displayRun?.status === "running" ? selectedRunId : null,
    (updated) => {
      setLiveRun(updated);
      qc.setQueryData(["conductor-run", selectedRunId], updated);
    }
  );

  // Reset live run when selection changes
  useEffect(() => {
    setLiveRun(null);
  }, [selectedRunId]);

  const launchMutation = useMutation({
    mutationFn: conductorApi.createRun,
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["conductor-runs"] });
      setSelectedRunId(run.id);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: conductorApi.cancelRun,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conductor-runs"] });
      if (selectedRunId) qc.invalidateQueries({ queryKey: ["conductor-run", selectedRunId] });
    },
  });

  const handleLaunch = () => {
    if (!frameworkId) return;
    launchMutation.mutate({ run_type: runType, framework: frameworkId });
  };

  const findingCounts = displayRun?.finding_counts ?? {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
        <p className="text-gray-500 mt-0.5">Launch automated compliance runs and monitor progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: launcher + history */}
        <div className="space-y-4">
          {/* Launch form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Launch AI Run</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Run Type</label>
                <select
                  value={runType}
                  onChange={(e) => setRunType(e.target.value as ConductorRun["run_type"])}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full_pipeline">Full Pipeline</option>
                  <option value="validate_only">Validate Only</option>
                  <option value="collect_only">Collect Only</option>
                  <option value="review_only">Review Only</option>
                  <option value="report_only">Report Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Framework</label>
                <select
                  value={frameworkId}
                  onChange={(e) => setFrameworkId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select framework…</option>
                  {frameworks.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleLaunch}
                disabled={!frameworkId || launchMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {launchMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Play size={15} />
                )}
                Launch AI Run
              </button>
              {launchMutation.isError && (
                <p className="text-xs text-red-600">Failed to launch run. Please try again.</p>
              )}
            </div>
          </div>

          {/* Live progress (if selected run is running) */}
          {displayRun?.status === "running" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-blue-600 animate-pulse" />
                <span className="text-sm font-semibold text-blue-700">Run in progress</span>
              </div>
              {displayRun.current_agent && (
                <p className="text-xs text-blue-600">
                  Current agent: <span className="font-medium">{displayRun.current_agent}</span>
                </p>
              )}
              <ProgressBar value={displayRun.progress} animated />
              <p className="text-xs text-blue-600 text-right">{displayRun.progress}%</p>
              <button
                onClick={() => cancelMutation.mutate(displayRun.id)}
                disabled={cancelMutation.isPending}
                className="w-full text-xs text-red-600 hover:text-red-700 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Cancel Run
              </button>
            </div>
          )}

          {/* Run history */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Run History</h2>
            </div>
            {runsLoading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : runs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No runs yet.</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id === selectedRunId ? null : run.id)}
                    className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedRunId === run.id ? "bg-blue-50 border-l-2 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{runTypeLabel(run.run_type)}</span>
                      <StatusBadge status={run.status} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {run.framework_name ?? run.framework ?? "No framework"}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar value={run.progress} animated={run.status === "running"} />
                      <span className="text-xs text-gray-400 shrink-0">{run.progress}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(run.created_at)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: run detail */}
        <div className="lg:col-span-2">
          {!selectedRunId ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 h-full flex flex-col items-center justify-center">
              <Activity className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm">Select a run from the history to view details.</p>
            </div>
          ) : !displayRun ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Run summary header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{runTypeLabel(displayRun.run_type)}</h2>
                    <p className="text-sm text-gray-500">
                      {displayRun.framework_name ?? displayRun.framework ?? "No framework"}
                    </p>
                  </div>
                  <StatusBadge status={displayRun.status} />
                </div>

                {displayRun.status === "running" && (
                  <div className="mb-4 space-y-1">
                    <ProgressBar value={displayRun.progress} animated />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{displayRun.current_agent ?? "Processing…"}</span>
                      <span>{displayRun.progress}%</span>
                    </div>
                  </div>
                )}

                {/* Compliance score */}
                {displayRun.compliance_score != null && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.9155"
                          fill="none"
                          stroke={displayRun.compliance_score >= 80 ? "#22c55e" : displayRun.compliance_score >= 60 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="3"
                          strokeDasharray={`${displayRun.compliance_score} ${100 - displayRun.compliance_score}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-700">{displayRun.compliance_score}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Compliance Score</p>
                      <p className="text-xs text-gray-500">
                        {displayRun.compliance_score >= 80
                          ? "Good standing"
                          : displayRun.compliance_score >= 60
                          ? "Needs improvement"
                          : "Critical gaps"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Finding severity pills */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(findingCounts).map(([sev, cnt]) => (
                    <span key={sev} className={`px-2.5 py-1 rounded-full text-xs font-medium ${severityColor(sev)}`}>
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}: {cnt}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps accordion */}
              {(displayRun.steps?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Agent Steps</h3>
                  <div className="space-y-2">
                    {displayRun.steps!.map((step) => (
                      <StepRow key={step.id} step={step} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
