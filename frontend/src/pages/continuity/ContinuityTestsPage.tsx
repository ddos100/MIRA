import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useContinuityPlans } from "@/api/continuity";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContinuityTest {
  id: string;
  plan: string;
  plan_title?: string;
  test_type: string;
  test_date: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  objectives?: string;
  result_summary?: string;
  rto_achieved_hours?: number;
  lead_tester_name?: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  plan: z.string().min(1, "Plan is required"),
  test_type: z.string().min(1, "Test type is required"),
  test_date: z.string().min(1, "Test date is required"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  objectives: z.string().optional(),
  result_summary: z.string().optional(),
  rto_achieved_hours: z.coerce.number().int().min(0).nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusVariant: Record<string, string> = {
  scheduled: "not_assessed",
  in_progress: "in_progress",
  completed: "approved",
  cancelled: "destructive",
};

const testTypeLabel: Record<string, string> = {
  tabletop: "Tabletop Exercise",
  walkthrough: "Walkthrough",
  simulation: "Simulation",
  full_activation: "Full Activation",
};

// ─── Form Modal ───────────────────────────────────────────────────────────────

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  editData?: ContinuityTest;
}

function TestFormModal({ open, onClose, editData }: FormModalProps) {
  const qc = useQueryClient();
  const { data: plansData } = useContinuityPlans({ page_size: 200 });
  const plans = plansData?.results ?? plansData ?? [];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editData
      ? {
          plan: editData.plan,
          test_type: editData.test_type,
          test_date: editData.test_date,
          status: editData.status,
          objectives: editData.objectives ?? "",
          result_summary: editData.result_summary ?? "",
          rto_achieved_hours: editData.rto_achieved_hours ?? undefined,
        }
      : {
          plan: "",
          test_type: "",
          test_date: "",
          status: "scheduled",
          objectives: "",
          result_summary: "",
        },
  });

  const createTest = useMutation({
    mutationFn: (data: FormValues) =>
      apiClient.post("/continuity/continuity-tests/", data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["continuity-tests-all"] }); reset(); onClose(); },
  });

  const updateTest = useMutation({
    mutationFn: (data: FormValues) =>
      apiClient.patch(`/continuity/continuity-tests/${editData!.id}/`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["continuity-tests-all"] }); onClose(); },
  });

  function onSubmit(values: FormValues) {
    const payload = { ...values, rto_achieved_hours: values.rto_achieved_hours || null };
    if (editData) updateTest.mutate(payload);
    else createTest.mutate(payload);
  }

  const isPending = createTest.isPending || updateTest.isPending;

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Test" : "Schedule Continuity Test"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Plan <span className="text-destructive">*</span>
          </label>
          <select
            {...register("plan")}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring",
              errors.plan && "border-destructive"
            )}
          >
            <option value="">Select a plan...</option>
            {(plans as Record<string, string>[]).map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          {errors.plan && <p className="text-xs text-destructive mt-1">{errors.plan.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Test Type <span className="text-destructive">*</span>
            </label>
            <select
              {...register("test_type")}
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring",
                errors.test_type && "border-destructive"
              )}
            >
              <option value="">Select type...</option>
              <option value="tabletop">Tabletop Exercise</option>
              <option value="walkthrough">Walkthrough</option>
              <option value="simulation">Simulation</option>
              <option value="full_activation">Full Activation</option>
            </select>
            {errors.test_type && <p className="text-xs text-destructive mt-1">{errors.test_type.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Status</label>
            <select
              {...register("status")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Test Date *" type="date" {...register("test_date")} error={errors.test_date?.message} />
          <Input label="RTO Achieved (hours)" type="number" min="0" {...register("rto_achieved_hours")} />
        </div>

        <Textarea label="Objectives" rows={3} placeholder="Describe the test objectives..." {...register("objectives")} />
        <Textarea label="Result Summary" rows={3} placeholder="Summarize the test results..." {...register("result_summary")} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting || isPending}>
            {editData ? "Save Changes" : "Schedule Test"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContinuityTestsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContinuityTest | undefined>();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: testsData, isLoading } = useQuery({
    queryKey: ["continuity-tests-all", { status: statusFilter, test_type: typeFilter }],
    queryFn: () =>
      apiClient.get("/continuity/continuity-tests/", {
        params: {
          page_size: 200,
          status: statusFilter || undefined,
          test_type: typeFilter || undefined,
        },
      }).then(r => r.data),
  });

  const tests: ContinuityTest[] = testsData?.results ?? [];

  const deleteTest = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/continuity/continuity-tests/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["continuity-tests-all"] }),
  });

  const total = tests.length;
  const completed = tests.filter(t => t.status === "completed").length;
  const scheduled = tests.filter(t => t.status === "scheduled").length;
  const inProgress = tests.filter(t => t.status === "in_progress").length;

  const statCards = [
    { label: "Total Tests", value: total, color: "text-foreground" },
    { label: "Scheduled", value: scheduled, color: "text-blue-600" },
    { label: "In Progress", value: inProgress, color: "text-yellow-600" },
    { label: "Completed", value: completed, color: "text-green-600" },
  ];

  const columns: Column<ContinuityTest>[] = [
    {
      key: "plan_title",
      header: "Plan",
      sortable: true,
      render: (row) => <span className="font-medium">{row.plan_title ?? row.plan}</span>,
    },
    {
      key: "test_type",
      header: "Test Type",
      render: (row) => (
        <span className="text-sm">{testTypeLabel[row.test_type] ?? row.test_type}</span>
      ),
    },
    {
      key: "test_date",
      header: "Date",
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={statusVariant[row.status] ?? "default"}>
          {row.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "rto_achieved_hours",
      header: "RTO Achieved",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.rto_achieved_hours != null ? `${row.rto_achieved_hours}h` : "—"}
        </span>
      ),
    },
    {
      key: "result_summary",
      header: "Result Summary",
      render: (row) => (
        <span className="text-sm text-muted-foreground truncate block max-w-[200px]" title={row.result_summary}>
          {row.result_summary || "—"}
        </span>
      ),
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
              if (confirm("Delete this test?")) deleteTest.mutate(row.id);
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
        title="Continuity Tests"
        description="Schedule and track business continuity plan tests."
        actions={
          <Button onClick={() => { setEditTarget(undefined); setModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            Schedule Test
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Types</option>
          <option value="tabletop">Tabletop Exercise</option>
          <option value="walkthrough">Walkthrough</option>
          <option value="simulation">Simulation</option>
          <option value="full_activation">Full Activation</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No continuity tests found.</p>
        </div>
      ) : (
        <DataTable<ContinuityTest>
          data={tests}
          columns={columns}
          emptyMessage="No continuity tests found."
        />
      )}

      <TestFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(undefined); }}
        editData={editTarget}
      />
    </div>
  );
}
