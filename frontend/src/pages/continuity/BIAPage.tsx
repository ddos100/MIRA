import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, BarChart3 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useBIAs } from "@/api/continuity";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DataTable, type Column } from "@/components/ui/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BIA {
  id: string;
  business_process: string;
  business_process_name?: string;
  rto_hours: number;
  rpo_hours: number;
  mtpd_hours: number;
  financial_impact_per_hour?: number | null;
  reputational_impact: string;
  dependencies?: string;
  minimum_resources?: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  business_process: z.string().min(1, "Business process is required"),
  rto_hours: z.coerce.number().int().min(0),
  rpo_hours: z.coerce.number().int().min(0),
  mtpd_hours: z.coerce.number().int().min(0),
  financial_impact_per_hour: z.coerce.number().nullable().optional(),
  reputational_impact: z.enum(["low", "medium", "high", "critical"]),
  dependencies: z.string().optional(),
  minimum_resources: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const impactVariant: Record<string, string> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

// ─── BIA Form Modal ───────────────────────────────────────────────────────────

interface BIAFormModalProps {
  open: boolean;
  onClose: () => void;
  editData?: BIA;
}

function BIAFormModal({ open, onClose, editData }: BIAFormModalProps) {
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editData
      ? {
          business_process: editData.business_process,
          rto_hours: editData.rto_hours,
          rpo_hours: editData.rpo_hours,
          mtpd_hours: editData.mtpd_hours,
          financial_impact_per_hour: editData.financial_impact_per_hour ?? undefined,
          reputational_impact: editData.reputational_impact as FormValues["reputational_impact"],
          dependencies: editData.dependencies ?? "",
          minimum_resources: editData.minimum_resources ?? "",
        }
      : {
          business_process: "",
          rto_hours: 24,
          rpo_hours: 4,
          mtpd_hours: 72,
          reputational_impact: "medium",
          dependencies: "",
          minimum_resources: "",
        },
  });

  const createBIA = useMutation({
    mutationFn: (data: FormValues) => apiClient.post("/continuity/bias/", data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bia"] }); reset(); onClose(); },
  });

  const updateBIA = useMutation({
    mutationFn: (data: FormValues) =>
      apiClient.patch(`/continuity/bias/${editData!.id}/`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bia"] }); onClose(); },
  });

  function onSubmit(values: FormValues) {
    if (editData) updateBIA.mutate(values);
    else createBIA.mutate(values);
  }

  const isPending = createBIA.isPending || updateBIA.isPending;

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit BIA" : "New Business Impact Analysis"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Business Process ID <span className="text-destructive">*</span>
          </label>
          <input
            {...register("business_process")}
            placeholder="Enter business process ID..."
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.business_process && (
            <p className="text-xs text-destructive mt-1">{errors.business_process.message}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="RTO (hours)" type="number" min="0" {...register("rto_hours")} />
          <Input label="RPO (hours)" type="number" min="0" {...register("rpo_hours")} />
          <Input label="MTPD (hours)" type="number" min="0" {...register("mtpd_hours")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Financial Impact per Hour ($)" type="number" min="0" step="0.01" {...register("financial_impact_per_hour")} />
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Reputational Impact</label>
            <select
              {...register("reputational_impact")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <Textarea label="Dependencies" rows={3} placeholder="List critical dependencies..." {...register("dependencies")} />
        <Textarea label="Minimum Resources" rows={3} placeholder="Minimum resources needed to recover..." {...register("minimum_resources")} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting || isPending}>
            {editData ? "Save Changes" : "Create BIA"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BIAPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BIA | undefined>();

  const { data, isLoading } = useBIAs();
  const biaList: BIA[] = data?.results ?? data ?? [];

  const columns: Column<BIA>[] = [
    {
      key: "business_process_name",
      header: "Business Process",
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.business_process_name ?? row.business_process}</span>
      ),
    },
    {
      key: "rto_hours",
      header: "RTO",
      render: (row) => <span className="text-sm">{row.rto_hours}h</span>,
    },
    {
      key: "rpo_hours",
      header: "RPO",
      render: (row) => <span className="text-sm">{row.rpo_hours}h</span>,
    },
    {
      key: "mtpd_hours",
      header: "MTPD",
      render: (row) => <span className="text-sm">{row.mtpd_hours}h</span>,
    },
    {
      key: "financial_impact_per_hour",
      header: "Financial Impact/hr",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.financial_impact_per_hour != null
            ? `$${Number(row.financial_impact_per_hour).toLocaleString()}`
            : "—"}
        </span>
      ),
    },
    {
      key: "reputational_impact",
      header: "Reputational Impact",
      render: (row) => (
        <Badge variant={impactVariant[row.reputational_impact] ?? "default"}>
          {row.reputational_impact.charAt(0).toUpperCase() + row.reputational_impact.slice(1)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setEditTarget(row); setModalOpen(true); }}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Impact Analyses"
        description="Document RTO, RPO, and MTPD for critical business processes."
        actions={
          <Button onClick={() => { setEditTarget(undefined); setModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            New BIA
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : biaList.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No BIAs found. Create one to get started.</p>
        </div>
      ) : (
        <DataTable<BIA>
          data={biaList}
          columns={columns}
          emptyMessage="No BIAs found."
        />
      )}

      <BIAFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(undefined); }}
        editData={editTarget}
      />
    </div>
  );
}
