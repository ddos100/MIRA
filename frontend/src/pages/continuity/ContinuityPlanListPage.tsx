import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useContinuityPlans, useCreateContinuityPlan } from "@/api/continuity";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContinuityPlan {
  id: string;
  title: string;
  status: string;
  version: string;
  owner_name?: string;
  review_date?: string | null;
  business_processes?: unknown[];
  business_processes_count?: number;
  scope?: string;
  objectives?: string;
  triggers?: string;
  procedures?: string;
  approved_at?: string | null;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  scope: z.string().optional(),
  objectives: z.string().optional(),
  triggers: z.string().optional(),
  procedures: z.string().optional(),
  status: z.enum(["draft", "approved", "retired"]),
  version: z.string().optional(),
  approved_at: z.string().optional(),
  review_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Options ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "retired", label: "Retired" },
];

const STATUS_FORM_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "retired", label: "Retired" },
];

function statusVariant(status: string): string {
  switch (status) {
    case "approved": return "approved";
    case "retired": return "destructive";
    default: return "draft";
  }
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function PlanFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPlan = useCreateContinuityPlan();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", scope: "", objectives: "", triggers: "", procedures: "", status: "draft", version: "1.0", approved_at: "", review_date: "" },
  });

  async function onSubmit(values: FormValues) {
    const payload: Record<string, unknown> = { ...values };
    if (!payload.approved_at) payload.approved_at = null;
    if (!payload.review_date) payload.review_date = null;
    await createPlan.mutateAsync(payload);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Business Continuity Plan" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title" placeholder="Plan title" error={errors.title?.message} {...register("title")} />
        <Textarea label="Scope" placeholder="Describe the scope of this plan…" rows={3} {...register("scope")} />
        <Textarea label="Objectives" placeholder="List the plan objectives…" rows={3} {...register("objectives")} />
        <Textarea label="Triggers" placeholder="Describe trigger conditions…" rows={3} {...register("triggers")} />
        <Textarea label="Procedures" placeholder="Document recovery procedures…" rows={4} {...register("procedures")} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Status" options={STATUS_FORM_OPTIONS} {...register("status")} />
          <Input label="Version" placeholder="1.0" {...register("version")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Approved At" type="datetime-local" {...register("approved_at")} />
          <Input label="Review Date" type="date" {...register("review_date")} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Create Plan</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContinuityPlanListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const params: Record<string, unknown> = {};
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useContinuityPlans(params);
  const plans: ContinuityPlan[] = data?.results ?? data ?? [];

  const columns: Column<ContinuityPlan>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (row) => (
        <button
          className="text-left font-medium text-foreground hover:underline"
          onClick={() => navigate(`/continuity/${row.id}`)}
        >
          {row.title}
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={statusVariant(row.status)}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "version",
      header: "Version",
      render: (row) => <span className="text-sm text-muted-foreground">{row.version || "—"}</span>,
    },
    {
      key: "owner_name",
      header: "Owner",
      render: (row) => <span className="text-sm text-muted-foreground">{row.owner_name || "—"}</span>,
    },
    {
      key: "review_date",
      header: "Review Date",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.review_date ? new Date(row.review_date).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "business_processes_count",
      header: "Business Processes",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.business_processes_count ?? row.business_processes?.length ?? 0}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Continuity Plans"
        description="Manage and track business continuity plans."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Plan
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
          aria-label="Filter by status"
        />
      </div>

      <DataTable<ContinuityPlan>
        data={plans}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No continuity plans found. Create one to get started."
      />

      {modalOpen && <PlanFormModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
