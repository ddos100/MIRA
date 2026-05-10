import { useState } from "react";
import { Plus, Pencil, CheckCircle, Inbox, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useCorrectiveActions,
  useCreateCorrectiveAction,
  useUpdateCorrectiveAction,
  useDeleteCorrectiveAction,
  useVerifyCorrectiveAction,
  type CorrectiveActionPlan,
  type CAPSeverity,
  type CAPStatus,
  type CAPParams,
} from "@/api/core";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

const severities: CAPSeverity[] = ["critical", "high", "medium", "low"];
const statuses: CAPStatus[] = [
  "open", "in_progress", "blocked", "resolved", "verified", "overdue", "cancelled",
];

const severityVariant: Record<CAPSeverity, string> = {
  critical: "destructive",
  high: "high",
  medium: "in_progress",
  low: "active",
};

const statusVariant: Record<CAPStatus, string> = {
  open: "draft",
  in_progress: "in_progress",
  blocked: "destructive",
  resolved: "pending",
  verified: "approved",
  overdue: "destructive",
  cancelled: "inactive",
};

const capSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  root_cause: z.string().optional().default(""),
  severity: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum([
    "open", "in_progress", "blocked", "resolved", "verified", "overdue", "cancelled",
  ]),
  target_completion_date: z.string().nullable().optional(),
  progress_pct: z.coerce.number().min(0).max(100),
});

type CAPFormValues = z.infer<typeof capSchema>;

function CAPFormModal({
  open,
  onClose,
  cap,
}: {
  open: boolean;
  onClose: () => void;
  cap?: CorrectiveActionPlan;
}) {
  const create = useCreateCorrectiveAction();
  const update = useUpdateCorrectiveAction(cap?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CAPFormValues>({
    resolver: zodResolver(capSchema),
    defaultValues: cap
      ? {
          title: cap.title,
          description: cap.description,
          root_cause: cap.root_cause,
          severity: cap.severity,
          status: cap.status,
          target_completion_date: cap.target_completion_date,
          progress_pct: cap.progress_pct,
        }
      : {
          title: "",
          description: "",
          root_cause: "",
          severity: "medium",
          status: "open",
          target_completion_date: null,
          progress_pct: 0,
        },
  });

  const isEditing = !!cap;
  const mutation = isEditing ? update : create;

  function onSubmit(values: CAPFormValues) {
    mutation.mutate(
      {
        ...values,
        target_completion_date: values.target_completion_date || null,
      },
      {
        onSuccess: () => { reset(); onClose(); },
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Corrective Action" : "New Corrective Action Plan"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" {...register("title")} error={errors.title?.message} />
        <Textarea
          label="Description *"
          rows={3}
          {...register("description")}
          error={errors.description?.message}
        />
        <Textarea
          label="Root Cause (5-Whys / fishbone summary)"
          rows={2}
          {...register("root_cause")}
        />

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Severity *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("severity")}>
              {severities.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Status *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("status")}>
              {statuses.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
            </select>
          </div>
          <Input
            label="Progress %"
            type="number"
            min={0}
            max={100}
            {...register("progress_pct")}
            error={errors.progress_pct?.message}
          />
        </div>

        <Input
          label="Target Completion Date"
          type="date"
          {...register("target_completion_date")}
        />

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save corrective action.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Create CAP"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function VerifyModal({
  open,
  onClose,
  cap,
}: {
  open: boolean;
  onClose: () => void;
  cap?: CorrectiveActionPlan;
}) {
  const verify = useVerifyCorrectiveAction(cap?.id ?? "");
  const [notes, setNotes] = useState("");

  function submit() {
    verify.mutate(notes, {
      onSuccess: () => { setNotes(""); onClose(); },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Verify Corrective Action" size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Confirm that the remediation for <strong>{cap?.title}</strong> has been
          implemented and is effective. This closes the CAP and writes verification metadata.
        </p>
        <Textarea
          label="Verification Notes / Evidence"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} isLoading={verify.isPending}>
            <CheckCircle className="h-4 w-4" />
            Verify Closed
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function CorrectiveActionsPage() {
  const [params, setParams] = useState<CAPParams>({ page: 1, page_size: 25 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editCap, setEditCap] = useState<CorrectiveActionPlan | undefined>();
  const [verifyCap, setVerifyCap] = useState<CorrectiveActionPlan | undefined>();
  const remove = useDeleteCorrectiveAction();

  const { data, isLoading, isError } = useCorrectiveActions(params);
  const caps = (data?.results ?? []) as CorrectiveActionPlan[];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (params.page_size ?? 25));
  const currentPage = params.page ?? 1;

  const overdueCount = caps.filter((c) => c.is_overdue).length;
  const openCount = caps.filter((c) => !["verified", "cancelled"].includes(c.status)).length;
  const verifiedCount = caps.filter((c) => c.status === "verified").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corrective Action Plans</h1>
          <p className="text-sm text-muted-foreground">
            Centralised remediation tracker linked to compliance gaps, control issues, incidents, and audit findings
            (ISO 27001:2022 §10.1).
          </p>
        </div>
        <Button onClick={() => { setEditCap(undefined); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          New CAP
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total CAPs", value: total, color: "text-foreground" },
          { label: "Open", value: openCount, color: "text-yellow-600" },
          { label: "Overdue", value: overdueCount, color: "text-red-600" },
          { label: "Verified Closed", value: verifiedCount, color: "text-green-600" },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search CAPs..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-56"
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value || undefined, page: 1 }))}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          onChange={(e) => setParams((p) => ({ ...p, status: (e.target.value as CAPStatus | ""), page: 1 }))}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          onChange={(e) => setParams((p) => ({ ...p, severity: (e.target.value as CAPSeverity | ""), page: 1 }))}
        >
          <option value="">All Severities</option>
          {severities.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load corrective actions.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severity</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Progress</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {caps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <Inbox className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No corrective action plans.
                  </td>
                </tr>
              ) : (
                caps.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-2">
                        {c.is_overdue && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                        {c.title}
                      </div>
                      {c.source_content_type_label && (
                        <div className="text-xs text-muted-foreground">
                          → {c.source_content_type_label}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={severityVariant[c.severity]}>{c.severity}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[c.status]}>{c.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.owner_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      <span className={cn(c.is_overdue && "text-red-600 font-medium")}>
                        {c.target_completion_date
                          ? format(new Date(c.target_completion_date), "MMM d, yyyy")
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              c.progress_pct >= 100 ? "bg-green-500" :
                              c.progress_pct >= 50 ? "bg-yellow-500" : "bg-red-500",
                            )}
                            style={{ width: `${c.progress_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{c.progress_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {c.status !== "verified" && c.status !== "cancelled" && (
                          <Button size="icon" variant="ghost" title="Verify closed" onClick={() => setVerifyCap(c)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditCap(c); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete CAP "${c.title}"?`)) remove.mutate(c.id);
                          }}
                        >
                          ×
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {caps.length} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}>Previous</Button>
            <span className="flex h-8 items-center px-3 text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      <CAPFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditCap(undefined); }}
        cap={editCap}
      />
      <VerifyModal
        open={!!verifyCap}
        onClose={() => setVerifyCap(undefined)}
        cap={verifyCap}
      />
    </div>
  );
}
