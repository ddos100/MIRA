import { useState } from "react";
import { Plus, Pencil, ShieldAlert, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useDPIAs,
  useCreateDPIA,
  useUpdateDPIA,
  useProcessingActivities,
  type DPIA,
  type DPIAParams,
  type DPIAStatus,
  type ResidualRiskLevel,
  type PrivacyRiskSummary,
} from "@/api/privacy";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusLabels: Record<DPIAStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
};

const statusVariants: Record<DPIAStatus, string> = {
  draft: "draft",
  in_review: "in_progress",
  approved: "approved",
  rejected: "rejected",
};

const riskLabels: Record<ResidualRiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very High",
};

const riskVariants: Record<ResidualRiskLevel, string> = {
  low: "low",
  medium: "medium",
  high: "high",
  very_high: "critical",
};

function riskScoreColor(score: number) {
  if (score >= 15) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (score >= 9)  return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  if (score >= 4)  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
}

function riskStatusBadge(status: string) {
  const cls: Record<string, string> = {
    open: "bg-red-100 text-red-800",
    in_treatment: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    closed: "bg-green-100 text-green-800",
    transferred: "bg-purple-100 text-purple-800",
  };
  const label: Record<string, string> = {
    open: "Open", in_treatment: "In Treatment", accepted: "Accepted",
    closed: "Closed", transferred: "Transferred",
  };
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", cls[status] ?? "bg-muted text-muted-foreground")}>
      {label[status] ?? status}
    </span>
  );
}

function PrivacyRisksPanel({ risks }: { risks: PrivacyRiskSummary[] }) {
  if (risks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No privacy risks linked to this DPIA yet.</p>
    );
  }
  return (
    <div className="space-y-2">
      {risks.map(r => (
        <div key={r.id} className="flex items-start gap-3 rounded border bg-background px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{r.title}</p>
            {r.category_name && (
              <p className="text-xs text-muted-foreground">{r.category_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold", riskScoreColor(r.residual_score))}>
              Score {r.residual_score}
            </span>
            {riskStatusBadge(r.status)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const dpiaSchema = z.object({
  title: z.string().min(1, "Title is required"),
  processing_activity: z.string().min(1, "Processing activity is required"),
  description: z.string(),
  necessity_assessment: z.string(),
  proportionality_assessment: z.string(),
  risk_description: z.string(),
  mitigation_measures: z.string(),
  residual_risk_level: z.enum(["low", "medium", "high", "very_high"]).nullable(),
  dpo_consultation_required: z.boolean(),
  review_date: z.string().nullable(),
});

type DPIAFormValues = z.infer<typeof dpiaSchema>;

// ─── Form Modal ────────────────────────────────────────────────────────────────

interface DPIAFormModalProps {
  open: boolean;
  onClose: () => void;
  dpia?: DPIA;
}

function DPIAFormModal({ open, onClose, dpia }: DPIAFormModalProps) {
  const create = useCreateDPIA();
  const update = useUpdateDPIA(dpia?.id ?? "");
  const { data: activitiesData } = useProcessingActivities({ page_size: 100 });
  const activities = activitiesData?.results ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DPIAFormValues>({
    resolver: zodResolver(dpiaSchema),
    defaultValues: dpia
      ? {
          title: dpia.title,
          processing_activity: dpia.processing_activity,
          description: dpia.description ?? "",
          necessity_assessment: dpia.necessity_assessment ?? "",
          proportionality_assessment: dpia.proportionality_assessment ?? "",
          risk_description: dpia.risk_description ?? "",
          mitigation_measures: dpia.mitigation_measures ?? "",
          residual_risk_level: dpia.residual_risk_level ?? null,
          dpo_consultation_required: dpia.dpo_consultation_required ?? false,
          review_date: dpia.review_date ?? null,
        }
      : {
          title: "",
          processing_activity: "",
          description: "",
          necessity_assessment: "",
          proportionality_assessment: "",
          risk_description: "",
          mitigation_measures: "",
          residual_risk_level: null,
          dpo_consultation_required: false,
          review_date: null,
        },
  });

  const isEditing = !!dpia;
  const mutation = isEditing ? update : create;

  function onSubmit(values: DPIAFormValues) {
    mutation.mutate(values as Partial<DPIA>, {
      onSuccess: () => { reset(); onClose(); },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit DPIA" : "New DPIA"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" {...register("title")} error={errors.title?.message} />

        <div>
          <label className="text-sm font-medium text-foreground">Processing Activity *</label>
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("processing_activity")}
          >
            <option value="">— Select Activity —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {errors.processing_activity && (
            <p className="text-xs text-destructive mt-1">{errors.processing_activity.message}</p>
          )}
        </div>

        <Textarea label="Description" rows={2} {...register("description")} />
        <Textarea label="Necessity Assessment" rows={3} {...register("necessity_assessment")} />
        <Textarea label="Proportionality Assessment" rows={3} {...register("proportionality_assessment")} />
        <Textarea label="Risk Description" rows={3} {...register("risk_description")} />
        <Textarea label="Mitigation Measures" rows={3} {...register("mitigation_measures")} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Residual Risk Level</label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("residual_risk_level")}
            >
              <option value="">— Not Assessed —</option>
              {(["low", "medium", "high", "very_high"] as ResidualRiskLevel[]).map((r) => (
                <option key={r} value={r}>{riskLabels[r]}</option>
              ))}
            </select>
          </div>
          <Input label="Review Date" type="date" {...register("review_date")} />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" {...register("dpo_consultation_required")} className="rounded border-input" />
          DPO Consultation Required
        </label>

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save DPIA. Please try again.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Create DPIA"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DPIAListPage() {
  const [params, setParams] = useState<DPIAParams>({ page: 1, page_size: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editDpia, setEditDpia] = useState<DPIA | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useDPIAs(params);
  const dpias = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (params.page_size ?? 20));
  const currentPage = params.page ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Protection Impact Assessments</h1>
          <p className="text-sm text-muted-foreground">GDPR Article 35 – DPIAs for high-risk processing activities.</p>
        </div>
        <Button onClick={() => { setEditDpia(undefined); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          New DPIA
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search DPIAs..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-56"
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value || undefined, page: 1 }))}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, status: (e.target.value as DPIAStatus | ""), page: 1 }))}
        >
          <option value="">All Statuses</option>
          {(Object.entries(statusLabels) as [DPIAStatus, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, residual_risk_level: (e.target.value as ResidualRiskLevel | ""), page: 1 }))}
        >
          <option value="">All Risk Levels</option>
          {(Object.entries(riskLabels) as [ResidualRiskLevel, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load DPIAs.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Processing Activity</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assessor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Residual Risk</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Privacy Risks</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Review Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dpias.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    <ShieldAlert className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No DPIAs found.
                  </td>
                </tr>
              ) : (
                dpias.map((d) => {
                  const risks = d.privacy_risks_detail ?? [];
                  const isOpen = expandedId === d.id;
                  return (
                    <>
                      <tr key={d.id}
                        className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isOpen ? null : d.id)}>
                        <td className="w-8 px-2 py-3 text-muted-foreground">
                          {isOpen
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-4 py-3 font-medium">{d.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.processing_activity_detail?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.assessor_detail?.full_name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariants[d.status]}>{statusLabels[d.status]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {d.residual_risk_level ? (
                            <Badge variant={riskVariants[d.residual_risk_level]}>{riskLabels[d.residual_risk_level]}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {risks.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                              <AlertTriangle className="h-3 w-3" />
                              {risks.length} risk{risks.length !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.review_date ? format(new Date(d.review_date), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end">
                            <Button size="icon" variant="ghost" onClick={() => { setEditDpia(d); setModalOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr key={`${d.id}-risks`} className="bg-muted/10 border-b">
                          <td colSpan={9} className="px-6 py-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                              Privacy Risks — auto-replicated from lifecycle compliance assessments
                            </p>
                            <PrivacyRisksPanel risks={risks} />
                          </td>
                        </tr>
                      )}
                    </>
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
          <span>Showing {dpias.length} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}>Previous</Button>
            <span className="flex h-8 items-center px-3 text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      <DPIAFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditDpia(undefined); }} dpia={editDpia} />
    </div>
  );
}
