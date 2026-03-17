import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useControls } from "@/api/controls";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControlIssue {
  id: string;
  control: string;
  control_title?: string;
  title: string;
  description?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "accepted";
  due_date?: string;
  resolved_at?: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const issueSchema = z.object({
  control: z.string().min(1, "Control is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "in_progress", "resolved", "accepted"]),
  due_date: z.string().optional(),
});

type IssueFormValues = z.infer<typeof issueSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const severityVariant: Record<string, string> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const statusVariant: Record<string, string> = {
  open: "destructive",
  in_progress: "in_progress",
  resolved: "low",
  accepted: "not_assessed",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  accepted: "Accepted",
};

// ─── Issue Form Modal ─────────────────────────────────────────────────────────

interface IssueFormModalProps {
  open: boolean;
  onClose: () => void;
  editData?: ControlIssue;
}

function IssueFormModal({ open, onClose, editData }: IssueFormModalProps) {
  const qc = useQueryClient();
  const { data: controlsData } = useControls({ page_size: 200 });
  const controls = controlsData?.results ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: editData
      ? {
          control: editData.control,
          title: editData.title,
          description: editData.description ?? "",
          severity: editData.severity,
          status: editData.status,
          due_date: editData.due_date ?? "",
        }
      : {
          control: "",
          title: "",
          description: "",
          severity: "medium",
          status: "open",
          due_date: "",
        },
  });

  const createIssue = useMutation({
    mutationFn: (data: IssueFormValues) =>
      apiClient.post("/controls/control-issues/", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["control-issues-all"] });
      reset();
      onClose();
    },
  });

  const updateIssue = useMutation({
    mutationFn: (data: IssueFormValues) =>
      apiClient.patch(`/controls/control-issues/${editData!.id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["control-issues-all"] });
      onClose();
    },
  });

  const onSubmit = (values: IssueFormValues) => {
    const payload = { ...values, due_date: values.due_date || undefined };
    if (editData) updateIssue.mutate(payload);
    else createIssue.mutate(payload);
  };

  const isPending = createIssue.isPending || updateIssue.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? "Edit Issue" : "Log Control Issue"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Control <span className="text-destructive">*</span>
          </label>
          <select
            {...register("control")}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring",
              errors.control && "border-destructive"
            )}
          >
            <option value="">Select a control...</option>
            {(controls as Record<string, string>[]).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {errors.control && (
            <p className="text-xs text-destructive mt-1">{errors.control.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            {...register("title")}
            placeholder="Issue title..."
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring",
              errors.title && "border-destructive"
            )}
          />
          {errors.title && (
            <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Description</label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Describe the issue..."
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Severity</label>
            <select
              {...register("severity")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Status</label>
            <select
              {...register("status")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="accepted">Accepted</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Due Date</label>
          <input
            type="date"
            {...register("due_date")}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting || isPending}>
            {editData ? "Save Changes" : "Log Issue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ControlIssuesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ControlIssue | undefined>();
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: issuesData, isLoading } = useQuery({
    queryKey: ["control-issues-all", { severity: severityFilter, status: statusFilter }],
    queryFn: () =>
      apiClient
        .get("/controls/control-issues/", {
          params: {
            page_size: 200,
            severity: severityFilter || undefined,
            status: statusFilter || undefined,
          },
        })
        .then((r) => r.data),
  });

  const issues: ControlIssue[] = issuesData?.results ?? [];

  const deleteIssue = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/controls/control-issues/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control-issues-all"] }),
  });

  const total = issues.length;
  const open = issues.filter((i) => i.status === "open").length;
  const critical = issues.filter((i) => i.severity === "critical").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;

  const statCards = [
    { label: "Total Issues", value: total, color: "text-foreground" },
    { label: "Open", value: open, color: "text-red-600" },
    { label: "Critical Severity", value: critical, color: "text-orange-600" },
    { label: "Resolved", value: resolved, color: "text-green-600" },
  ];

  const columns: Column<ControlIssue>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "control_title",
      header: "Control",
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.control_title ?? row.control}</span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (row) => (
        <Badge variant={severityVariant[row.severity] ?? "default"}>
          {row.severity.charAt(0).toUpperCase() + row.severity.slice(1)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={statusVariant[row.status] ?? "default"}>
          {statusLabel[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      render: (row) => {
        if (!row.due_date) return <span className="text-muted-foreground">—</span>;
        const overdue = row.due_date < new Date().toISOString().split("T")[0] && row.status !== "resolved";
        return (
          <span className={overdue ? "text-red-600" : "text-muted-foreground"}>
            {row.due_date}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditTarget(row); setModalOpen(true); }}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this issue?")) deleteIssue.mutate(row.id);
            }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Control Issues"
        description="Track and remediate issues identified from control audits."
        actions={
          <Button onClick={() => { setEditTarget(undefined); setModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            Log Issue
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="accepted">Accepted</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No control issues found.</p>
        </div>
      ) : (
        <DataTable<ControlIssue>
          data={issues}
          columns={columns}
          emptyMessage="No control issues found."
        />
      )}

      <IssueFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(undefined); }}
        editData={editTarget}
      />
    </div>
  );
}
