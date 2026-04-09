import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, CalendarCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useControls } from "@/api/controls";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { cn } from "@/utils/cn";
import { ModuleReviewsTab } from "@/components/common/ModuleReviewsTab";
import { useContentTypes } from "@/api/automatedActions";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ControlTest {
  id: string;
  control: string;
  control_title?: string;
  test_date: string;
  tester?: string;
  tester_name?: string;
  result: "pass" | "fail" | "partial" | "not_tested";
  description?: string;
  evidence_description?: string;
  next_test_date?: string;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const testSchema = z.object({
  control: z.string().min(1, "Control is required"),
  test_date: z.string().min(1, "Test date is required"),
  result: z.enum(["pass", "fail", "partial", "not_tested"]),
  description: z.string().optional(),
  evidence_description: z.string().optional(),
  next_test_date: z.string().optional(),
});

type TestFormValues = z.infer<typeof testSchema>;

// ─── Result badge variant mapping ────────────────────────────────────────────

const resultVariant: Record<string, string> = {
  pass: "low",
  fail: "critical",
  partial: "medium",
  not_tested: "not_assessed",
};

const resultLabel: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  partial: "Partial",
  not_tested: "Not Tested",
};

// ─── Test Form Modal ──────────────────────────────────────────────────────────

interface ControlTestFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultControlId?: string;
  editData?: ControlTest;
}

function ControlTestFormModal({
  open,
  onClose,
  defaultControlId,
  editData,
}: ControlTestFormModalProps) {
  const qc = useQueryClient();
  const { data: controlsData } = useControls({ page_size: 200 });
  const controls = controlsData?.results ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: editData
      ? {
          control: editData.control,
          test_date: editData.test_date,
          result: editData.result,
          description: editData.description ?? "",
          evidence_description: editData.evidence_description ?? "",
          next_test_date: editData.next_test_date ?? "",
        }
      : {
          control: defaultControlId ?? "",
          result: "not_tested",
          description: "",
          evidence_description: "",
        },
  });

  const createTest = useMutation({
    mutationFn: (data: TestFormValues) =>
      apiClient.post("/controls/control-tests/", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["control-tests-all"] });
      qc.invalidateQueries({ queryKey: ["control-tests"] });
      reset();
      onClose();
    },
  });

  const updateTest = useMutation({
    mutationFn: (data: TestFormValues) =>
      apiClient
        .patch(`/controls/control-tests/${editData!.id}/`, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["control-tests-all"] });
      qc.invalidateQueries({ queryKey: ["control-tests"] });
      onClose();
    },
  });

  const onSubmit = (values: TestFormValues) => {
    const payload = {
      ...values,
      next_test_date: values.next_test_date || undefined,
    };
    if (editData) {
      updateTest.mutate(payload);
    } else {
      createTest.mutate(payload);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? "Edit Audit Test" : "Schedule Audit Test"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Control */}
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

        <div className="grid grid-cols-2 gap-4">
          {/* Test Date */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Test Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              {...register("test_date")}
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring",
                errors.test_date && "border-destructive"
              )}
            />
            {errors.test_date && (
              <p className="text-xs text-destructive mt-1">{errors.test_date.message}</p>
            )}
          </div>

          {/* Result */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Result
            </label>
            <select
              {...register("result")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="not_tested">Not Tested</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Describe the test procedure..."
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Evidence Description */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Evidence Description
          </label>
          <textarea
            {...register("evidence_description")}
            rows={3}
            placeholder="Describe the evidence collected..."
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Next Test Date */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Next Test Date
          </label>
          <input
            type="date"
            {...register("next_test_date")}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting || createTest.isPending || updateTest.isPending}
          >
            {editData ? "Save Changes" : "Schedule Test"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type AuditTab = "audits" | "reviews";

export default function ControlAuditsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<AuditTab>("audits");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ControlTest | undefined>();
  const [resultFilter, setResultFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: contentTypes = [] } = useContentTypes();
  const controlTestContentTypeId = contentTypes.find((ct) => ct.label === "controls.controltest")?.id;

  const { data: testsData, isLoading } = useQuery({
    queryKey: ["control-tests-all", { result: resultFilter, date_from: dateFrom, date_to: dateTo }],
    queryFn: () =>
      apiClient
        .get("/controls/control-tests/", {
          params: {
            page_size: 200,
            result: resultFilter || undefined,
            test_date_after: dateFrom || undefined,
            test_date_before: dateTo || undefined,
          },
        })
        .then((r) => r.data),
  });

  const tests: ControlTest[] = testsData?.results ?? [];

  const deleteTest = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/controls/control-tests/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control-tests-all"] }),
  });

  // ── Summary stats ──
  const total = tests.length;
  const passed = tests.filter((t) => t.result === "pass").length;
  const failed = tests.filter((t) => t.result === "fail").length;
  const today = new Date().toISOString().split("T")[0];
  const scheduled = tests.filter(
    (t) => t.next_test_date && t.next_test_date >= today
  ).length;

  const statCards = [
    { label: "Total Tests", value: total, color: "text-foreground" },
    { label: "Passed", value: passed, color: "text-green-600" },
    { label: "Failed", value: failed, color: "text-red-600" },
    { label: "Upcoming", value: scheduled, color: "text-blue-600" },
  ];

  // ── Columns ──
  const columns: Column<ControlTest>[] = [
    {
      key: "control_title",
      header: "Control",
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.control_title ?? row.control}</span>
      ),
    },
    {
      key: "test_date",
      header: "Test Date",
      sortable: true,
    },
    {
      key: "tester_name",
      header: "Tester",
      render: (row) => row.tester_name ?? row.tester ?? "—",
    },
    {
      key: "result",
      header: "Result",
      sortable: true,
      render: (row) => (
        <Badge variant={resultVariant[row.result] ?? "default"}>
          {resultLabel[row.result] ?? row.result}
        </Badge>
      ),
    },
    {
      key: "evidence_description",
      header: "Evidence",
      render: (row) =>
        row.evidence_description ? (
          <span
            className="text-muted-foreground truncate block max-w-[200px]"
            title={row.evidence_description}
          >
            {row.evidence_description}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "next_test_date",
      header: "Next Test Date",
      render: (row) => {
        if (!row.next_test_date) return <span className="text-muted-foreground">—</span>;
        const isUpcoming = row.next_test_date >= today;
        return (
          <span className={isUpcoming ? "text-blue-600" : "text-muted-foreground"}>
            {row.next_test_date}
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
            onClick={(e) => {
              e.stopPropagation();
              setEditTarget(row);
              setModalOpen(true);
            }}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this test record?")) {
                deleteTest.mutate(row.id);
              }
            }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Delete"
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
        title="Control Audits"
        description="Schedule and track control tests and audit evidence."
        actions={
          activeTab === "audits" ? (
            <Button
              onClick={() => {
                setEditTarget(undefined);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Schedule Audit
            </Button>
          ) : null
        }
      />

      {/* Tab Bar */}
      <div className="flex gap-1 border-b">
        {([
          ["audits", "Audit Tests"],
          ["reviews", "Reviews"],
        ] as [AuditTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "reviews" && (
        <ModuleReviewsTab contentTypeId={controlTestContentTypeId} moduleLabel="Control Audit" />
      )}

      {activeTab === "audits" && <>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Results</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="partial">Partial</option>
          <option value="not_tested">Not Tested</option>
        </select>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No audit tests found. Schedule your first test to get started.</p>
        </div>
      ) : (
        <DataTable<ControlTest>
          data={tests}
          columns={columns}
          emptyMessage="No audit tests found."
        />
      )}

      <ControlTestFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(undefined);
        }}
        editData={editTarget}
      />
      </>}
    </div>
  );
}

// Export the modal so ControlDetailPage can reuse it
export { ControlTestFormModal };
export type { ControlTest };
