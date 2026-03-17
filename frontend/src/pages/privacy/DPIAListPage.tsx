import { useState } from "react";
import { Plus, Pencil, ShieldAlert } from "lucide-react";
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
} from "@/api/privacy";
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Processing Activity</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assessor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Residual Risk</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Review Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dpias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <ShieldAlert className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No DPIAs found.
                  </td>
                </tr>
              ) : (
                dpias.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.review_date ? format(new Date(d.review_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setEditDpia(d); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
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
