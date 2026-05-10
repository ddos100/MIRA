import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, ExternalLink, Search } from "lucide-react";
import { conductorApi } from "@/api/conductor";

const SEVERITY_CONFIG: Record<string, { label: string; classes: string }> = {
  critical: { label: "Critical", classes: "bg-red-100 text-red-800 border-red-200" },
  high: { label: "High", classes: "bg-orange-100 text-orange-800 border-orange-200" },
  medium: { label: "Medium", classes: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  low: { label: "Low", classes: "bg-blue-100 text-blue-800 border-blue-200" },
  info: { label: "Info", classes: "bg-gray-100 text-gray-700 border-gray-200" },
};

const STATUS_CONFIG: Record<string, string> = {
  open: "bg-red-50 text-red-700",
  promoted: "bg-green-50 text-green-700",
  dismissed: "bg-gray-50 text-gray-500",
  accepted: "bg-purple-50 text-purple-700",
};

const VALIDATION_CONFIG: Record<string, string> = {
  pass: "text-green-600",
  fail: "text-red-600",
  partial: "text-yellow-600",
  not_tested: "text-gray-400",
};

export default function ConductorFindings() {
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [search, setSearch] = useState("");

  const params: Record<string, string> = {};
  if (severityFilter !== "all") params.severity = severityFilter;
  if (statusFilter !== "all") params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["conductor-findings", severityFilter, statusFilter],
    queryFn: () => conductorApi.getFindings(params).then((r) => r.data),
  });

  const promoteMut = useMutation({
    mutationFn: (id: string) => conductorApi.promoteFinding(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-findings"] }),
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => conductorApi.updateFinding(id, { status: "dismissed" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-findings"] }),
  });

  const findings = (data?.results ?? []).filter((f: any) =>
    search ? f.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Findings</h1>
        <p className="text-gray-500 mt-1">Compliance gaps identified by the AI agent. Promote to ControlIssues manually.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search findings…"
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="promoted">Promoted</option>
          <option value="dismissed">Dismissed</option>
          <option value="accepted">Accepted</option>
        </select>

        <span className="text-sm text-gray-500 ml-auto">
          {findings.length} finding{findings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Findings table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : findings.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No findings match your filters</p>
            <p className="text-gray-400 text-sm mt-1">Run an AI agent to generate findings.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Control</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Validation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {findings.map((f: any) => {
                const sev = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.info;
                return (
                  <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${sev.classes}`}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 line-clamp-1">{f.title}</p>
                      {f.needs_human_review && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                          <AlertTriangle className="h-3 w-3" /> Needs review
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {f.control_title ? (
                        <a href={`/controls?id=${f.control}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                          {f.control_title} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium capitalize ${VALIDATION_CONFIG[f.validation_result] ?? "text-gray-400"}`}>
                        {f.validation_result?.replace("_", " ") ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_CONFIG[f.status] ?? ""}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {f.status === "open" && f.control && (
                          <button
                            onClick={() => promoteMut.mutate(f.id)}
                            disabled={promoteMut.isPending}
                            className="px-2.5 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            Promote to Issue
                          </button>
                        )}
                        {f.status === "open" && (
                          <button
                            onClick={() => {
                              if (confirm("Dismiss this finding?")) dismissMut.mutate(f.id);
                            }}
                            disabled={dismissMut.isPending}
                            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
