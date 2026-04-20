import { useState } from "react";
import { Plus, Pencil, Inbox } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useDSRs,
  useCreateDSR,
  useUpdateDSR,
  type DSR,
  type DSRParams,
  type DSRRequestType,
  type DSRStatus,
} from "@/api/privacy";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const requestTypeLabels: Record<DSRRequestType, string> = {
  access: "Access",
  erasure: "Erasure",
  portability: "Portability",
  rectification: "Rectification",
  restriction: "Restriction",
  objection: "Objection",
};

const requestTypeVariants: Record<DSRRequestType, string> = {
  access: "in_progress",
  erasure: "destructive",
  portability: "active",
  rectification: "pending",
  restriction: "high",
  objection: "medium",
};

const statusLabels: Record<DSRStatus, string> = {
  received: "Received",
  verified: "Verified",
  in_progress: "In Progress",
  completed: "Completed",
  denied: "Denied",
  withdrawn: "Withdrawn",
};

const statusVariants: Record<DSRStatus, string> = {
  received: "pending",
  verified: "in_progress",
  in_progress: "in_progress",
  completed: "completed",
  denied: "rejected",
  withdrawn: "inactive",
};

function deadlineDisplay(dsr: DSR): { label: string; overdue: boolean } {
  if (!dsr.deadline) return { label: "—", overdue: false };
  const deadline = new Date(dsr.deadline);
  if (dsr.is_overdue) return { label: "OVERDUE", overdue: true };
  const days = differenceInDays(deadline, new Date());
  return {
    label: `${format(deadline, "MMM d, yyyy")} (${days}d)`,
    overdue: false,
  };
}

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const dsrSchema = z.object({
  request_type: z.enum(["access", "erasure", "portability", "rectification", "restriction", "objection"]),
  status: z.enum(["received", "verified", "in_progress", "completed", "denied", "withdrawn"]),
  data_subject_name: z.string().min(1, "Name is required"),
  data_subject_email: z.string().email("Invalid email"),
  description: z.string(),
  received_at: z.string().min(1, "Received date is required"),
  response_notes: z.string(),
});

type DSRFormValues = z.infer<typeof dsrSchema>;

// ─── Form Modal ────────────────────────────────────────────────────────────────

interface DSRFormModalProps {
  open: boolean;
  onClose: () => void;
  dsr?: DSR;
}

function DSRFormModal({ open, onClose, dsr }: DSRFormModalProps) {
  const create = useCreateDSR();
  const update = useUpdateDSR(dsr?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DSRFormValues>({
    resolver: zodResolver(dsrSchema),
    defaultValues: dsr
      ? {
          request_type: dsr.request_type,
          status: dsr.status,
          data_subject_name: dsr.data_subject_name,
          data_subject_email: dsr.data_subject_email,
          description: dsr.description ?? "",
          received_at: dsr.received_at ? dsr.received_at.split("T")[0] : "",
          response_notes: dsr.response_notes ?? "",
        }
      : {
          request_type: "access",
          status: "received",
          data_subject_name: "",
          data_subject_email: "",
          description: "",
          received_at: format(new Date(), "yyyy-MM-dd"),
          response_notes: "",
        },
  });

  const isEditing = !!dsr;
  const mutation = isEditing ? update : create;

  function onSubmit(values: DSRFormValues) {
    mutation.mutate(values as Partial<DSR>, {
      onSuccess: () => { reset(); onClose(); },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Data Subject Request" : "New Data Subject Request"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Data Subject Name *" {...register("data_subject_name")} error={errors.data_subject_name?.message} />
          <Input label="Email *" type="email" {...register("data_subject_email")} error={errors.data_subject_email?.message} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Request Type *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("request_type")}>
              {(Object.entries(requestTypeLabels) as [DSRRequestType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Status *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("status")}>
              {(Object.entries(statusLabels) as [DSRStatus, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <Input label="Received Date *" type="date" {...register("received_at")} error={errors.received_at?.message} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <Textarea label="Response Notes" rows={3} {...register("response_notes")} />

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save DSR. Please try again.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Create DSR"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DSRListPage() {
  const [params, setParams] = useState<DSRParams>({ page: 1, page_size: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editDsr, setEditDsr] = useState<DSR | undefined>();

  const { data, isLoading, isError } = useDSRs(params);
  // Load all for stat cards
  const { data: allData } = useDSRs({ page_size: 1000 });
  const allDsrs = allData?.results ?? [];

  const dsrs = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (params.page_size ?? 20));
  const currentPage = params.page ?? 1;

  // Stats
  const overdueCount = allDsrs.filter((d) => d.is_overdue).length;
  const pendingCount = allDsrs.filter((d) => d.status === "received" || d.status === "verified" || d.status === "in_progress").length;
  const completedCount = allDsrs.filter((d) => d.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Subject Requests</h1>
          <p className="text-sm text-muted-foreground">GDPR Articles 15-22 – Manage data subject rights requests.</p>
        </div>
        <Button onClick={() => { setEditDsr(undefined); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          New DSR
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total DSRs", value: allData?.count ?? "—", color: "text-foreground" },
          { label: "Overdue", value: overdueCount, color: "text-red-600" },
          { label: "Pending", value: pendingCount, color: "text-yellow-600" },
          { label: "Completed", value: completedCount, color: "text-green-600" },
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
          placeholder="Search requests..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-56"
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value || undefined, page: 1 }))}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, request_type: (e.target.value as DSRRequestType | ""), page: 1 }))}
        >
          <option value="">All Types</option>
          {(Object.entries(requestTypeLabels) as [DSRRequestType, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, status: (e.target.value as DSRStatus | ""), page: 1 }))}
        >
          <option value="">All Statuses</option>
          {(Object.entries(statusLabels) as [DSRStatus, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load data subject requests.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data Subject</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Received</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Deadline</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Handler</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dsrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    <Inbox className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No data subject requests found.
                  </td>
                </tr>
              ) : (
                dsrs.map((d) => {
                  const dl = deadlineDisplay(d);
                  return (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{d.data_subject_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{d.data_subject_email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={requestTypeVariants[d.request_type]}>
                          {requestTypeLabels[d.request_type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariants[d.status]}>{statusLabels[d.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {d.received_at ? format(new Date(d.received_at), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn("font-medium", dl.overdue ? "text-red-600" : "text-foreground")}>
                          {dl.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.handler_detail?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button size="icon" variant="ghost" onClick={() => { setEditDsr(d); setModalOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {dsrs.length} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}>Previous</Button>
            <span className="flex h-8 items-center px-3 text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      <DSRFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditDsr(undefined); }} dsr={editDsr} />
    </div>
  );
}
