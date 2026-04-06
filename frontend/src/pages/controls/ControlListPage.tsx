import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus, Shield, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useControls, useDeleteControl, controlKeys } from "@/api/controls";
import { useControls as useControlsHook } from "@/api/controls";
import { useExportCsv } from "@/api/useExportCsv";
import { ImportModal } from "@/components/common/ImportModal";

// Inline minimal UI until shared components are ready
function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

const typeColors: Record<string, string> = {
  preventive: "bg-blue-100 text-blue-800",
  detective: "bg-purple-100 text-purple-800",
  corrective: "bg-orange-100 text-orange-800",
  directive: "bg-gray-100 text-gray-800",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
  under_review: "bg-yellow-100 text-yellow-800",
};

export default function ControlListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const { exportCsv, isExporting } = useExportCsv();

  const { data, isLoading } = useControls({
    search,
    status: statusFilter || undefined,
    control_type: typeFilter || undefined,
    page,
  });

  const controls = data?.results ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Control Library</h1>
          <p className="text-muted-foreground">Manage preventive, detective, and corrective controls.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              exportCsv("/controls/export-csv/", "controls", {
                search: search || undefined,
                status: statusFilter || undefined,
                control_type: typeFilter || undefined,
              })
            }
            disabled={isExporting}
            className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm font-medium hover:bg-accent"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => navigate("/controls/new")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Control
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search controls..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="under_review">Under Review</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Types</option>
          <option value="preventive">Preventive</option>
          <option value="detective">Detective</option>
          <option value="corrective">Corrective</option>
          <option value="directive">Directive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Frequency</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Next Review</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : controls.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No controls found. Add your first control to get started.
                  </td>
                </tr>
              )
              : controls.map((c: Record<string, string>) => (
                <tr
                  key={c.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/controls/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3">
                    <Badge className={typeColors[c.control_type] ?? "bg-gray-100 text-gray-800"}>
                      {c.control_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 capitalize">{c.frequency}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusColors[c.status] ?? "bg-gray-100 text-gray-800"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.next_review_date ?? "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/controls/controls/import-csv/"
        entityName="Controls"
        templateColumns={["title", "control_type", "frequency", "description", "notes"]}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: controlKeys.lists() })}
      />
    </div>
  );
}
