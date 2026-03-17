import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useIncidents,
  useCreateIncident,
  useUpdateIncident,
  useDeleteIncident,
  useIncidentCategories,
  type Incident,
  type IncidentParams,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/api/incidents";
import { useExportCsv } from "@/api/useExportCsv";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const severityLabels: Record<IncidentSeverity, string> = {
  p1: "P1 – Critical",
  p2: "P2 – High",
  p3: "P3 – Medium",
  p4: "P4 – Low",
};

const statusLabels: Record<IncidentStatus, string> = {
  new: "New",
  triaged: "Triaged",
  investigating: "Investigating",
  contained: "Contained",
  resolved: "Resolved",
  closed: "Closed",
};

const statusVariants: Record<IncidentStatus, string> = {
  new: "open",
  triaged: "pending",
  investigating: "in_progress",
  contained: "medium",
  resolved: "completed",
  closed: "closed",
};

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const incidentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  category: z.string().nullable(),
  severity: z.enum(["p1", "p2", "p3", "p4"]),
  status: z.enum(["new", "triaged", "investigating", "contained", "resolved", "closed"]),
  detected_at: z.string().nullable(),
  reported_at: z.string().nullable(),
  is_data_breach: z.boolean(),
  gdpr_notification_required: z.boolean(),
  root_cause: z.string(),
  lessons_learned: z.string(),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

// ─── Form Modal ────────────────────────────────────────────────────────────────

interface IncidentFormModalProps {
  open: boolean;
  onClose: () => void;
  incident?: Incident;
}

export function IncidentFormModal({ open, onClose, incident }: IncidentFormModalProps) {
  const create = useCreateIncident();
  const update = useUpdateIncident(incident?.id ?? "");
  const { data: categoriesData } = useIncidentCategories();
  const categories = categoriesData?.results ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: incident
      ? {
          title: incident.title,
          description: incident.description ?? "",
          category: incident.category ?? null,
          severity: incident.severity,
          status: incident.status,
          detected_at: incident.detected_at ? incident.detected_at.split("T")[0] : null,
          reported_at: incident.reported_at ? incident.reported_at.split("T")[0] : null,
          is_data_breach: incident.is_data_breach,
          gdpr_notification_required: incident.gdpr_notification_required,
          root_cause: incident.root_cause ?? "",
          lessons_learned: incident.lessons_learned ?? "",
        }
      : {
          title: "",
          description: "",
          category: null,
          severity: "p3",
          status: "new",
          detected_at: null,
          reported_at: null,
          is_data_breach: false,
          gdpr_notification_required: false,
          root_cause: "",
          lessons_learned: "",
        },
  });

  const isEditing = !!incident;
  const mutation = isEditing ? update : create;

  function onSubmit(values: IncidentFormValues) {
    mutation.mutate(values as Partial<Incident>, {
      onSuccess: () => { reset(); onClose(); },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Incident" : "New Incident"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" {...register("title")} error={errors.title?.message} />
        <Textarea label="Description" rows={3} {...register("description")} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Category</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("category")}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Severity *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("severity")}>
              {(["p1","p2","p3","p4"] as IncidentSeverity[]).map((s) => (
                <option key={s} value={s}>{severityLabels[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Status *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("status")}>
              {(Object.entries(statusLabels) as [IncidentStatus, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <Input label="Detected At" type="date" {...register("detected_at")} />
          <Input label="Reported At" type="date" {...register("reported_at")} />
        </div>

        <Textarea label="Root Cause" rows={2} {...register("root_cause")} />
        <Textarea label="Lessons Learned" rows={2} {...register("lessons_learned")} />

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("is_data_breach")} className="rounded border-input" />
            Data Breach
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("gdpr_notification_required")} className="rounded border-input" />
            GDPR Notification Required
          </label>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save incident. Please try again.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Create Incident"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function IncidentListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<IncidentParams>({ page: 1, page_size: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<Incident | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Incident | undefined>();
  const { exportCsv, isExporting } = useExportCsv();

  const { data, isLoading, isError } = useIncidents(params);
  const { data: allData } = useIncidents({ page_size: 1000 });
  const { data: categoriesData } = useIncidentCategories();
  const categories = categoriesData?.results ?? [];
  const deleteIncident = useDeleteIncident();

  const incidents = data?.results ?? [];
  const allIncidents = allData?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (params.page_size ?? 20));
  const currentPage = params.page ?? 1;

  // Stats
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const openHighCount = allIncidents.filter((i) => (i.severity === "p1" || i.severity === "p2") && i.status !== "closed" && i.status !== "resolved").length;
  const mediumCount = allIncidents.filter((i) => i.severity === "p3" && i.status !== "closed" && i.status !== "resolved").length;
  const lowCount = allIncidents.filter((i) => i.severity === "p4" && i.status !== "closed" && i.status !== "resolved").length;
  const closedThisMonth = allIncidents.filter((i) => {
    if (!i.closed_at) return false;
    const d = new Date(i.closed_at);
    return d >= monthStart && d <= monthEnd;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incident Register</h1>
          <p className="text-sm text-muted-foreground">Track and manage security and operational incidents.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportCsv("/incidents/export-csv/", "incidents", {
                status: params.status,
                severity: params.severity,
              })
            }
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Button onClick={() => { setEditIncident(undefined); setModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Incident
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Open P1/P2", value: openHighCount, color: "text-red-600" },
          { label: "Open P3 (Medium)", value: mediumCount, color: "text-yellow-600" },
          { label: "Open P4 (Low)", value: lowCount, color: "text-green-600" },
          { label: "Closed This Month", value: closedThisMonth, color: "text-muted-foreground" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{card.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search incidents..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-56"
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value || undefined, page: 1 }))}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, severity: (e.target.value as IncidentSeverity | ""), page: 1 }))}
        >
          <option value="">All Severities</option>
          {(["p1","p2","p3","p4"] as IncidentSeverity[]).map((s) => (
            <option key={s} value={s}>{severityLabels[s]}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, status: (e.target.value as IncidentStatus | ""), page: 1 }))}
        >
          <option value="">All Statuses</option>
          {(Object.entries(statusLabels) as [IncidentStatus, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, category: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => {
            const val = e.target.value;
            setParams((p) => ({ ...p, is_data_breach: val === "" ? "" : val === "true", page: 1 }));
          }}
        >
          <option value="">Data Breach: All</option>
          <option value="true">Data Breach: Yes</option>
          <option value="false">Data Breach: No</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load incidents.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severity</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Detected</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Flags</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    <AlertTriangle className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No incidents found.
                  </td>
                </tr>
              ) : (
                incidents.map((i) => (
                  <tr key={i.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <button
                        onClick={() => navigate(`/incidents/${i.id}`)}
                        className="text-primary hover:underline text-left"
                      >
                        {i.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {i.category_detail?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={i.severity}>{severityLabels[i.severity]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariants[i.status]}>{statusLabels[i.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {i.owner_detail?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {i.detected_at ? format(new Date(i.detected_at), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {i.is_data_breach && <Badge variant="destructive">Breach</Badge>}
                        {i.gdpr_notification_required && <Badge variant="high">GDPR</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/incidents/${i.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditIncident(i); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {incidents.length} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}>Previous</Button>
            <span className="flex h-8 items-center px-3 text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      <IncidentFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditIncident(undefined); }} incident={editIncident} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Incident"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteIncident.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(undefined) });
        }}
        onCancel={() => setDeleteTarget(undefined)}
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteIncident.isPending}
      />
    </div>
  );
}
