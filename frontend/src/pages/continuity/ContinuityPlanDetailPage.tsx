import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useContinuityPlan,
  useUpdateContinuityPlan,
  useContinuityTests,
  useCreateContinuityTest,
} from "@/api/continuity";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContinuityTest {
  id: string;
  plan: string;
  test_type: string;
  test_date: string;
  status: string;
  objectives?: string;
  result_summary?: string;
  rto_achieved_hours?: number;
  lead_tester_name?: string;
}

// ─── Edit Plan Schema ──────────────────────────────────────────────────────────

const editSchema = z.object({
  title: z.string().min(1),
  scope: z.string().optional(),
  objectives: z.string().optional(),
  triggers: z.string().optional(),
  procedures: z.string().optional(),
  status: z.enum(["draft", "approved", "retired"]),
  version: z.string().optional(),
  review_date: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

// ─── Test Schema ──────────────────────────────────────────────────────────────

const testSchema = z.object({
  test_type: z.string().min(1, "Test type is required"),
  test_date: z.string().min(1, "Test date is required"),
  status: z.string(),
  objectives: z.string().optional(),
  result_summary: z.string().optional(),
});

type TestFormValues = z.infer<typeof testSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: string) {
  return status === "approved" ? "approved" : status === "retired" ? "destructive" : "draft";
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  id: string;
  defaultValues: EditFormValues;
}

function EditPlanModal({ open, onClose, id, defaultValues }: EditModalProps) {
  const update = useUpdateContinuityPlan(id);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues,
  });

  async function onSubmit(values: EditFormValues) {
    const payload: Record<string, unknown> = { ...values };
    if (!payload.review_date) payload.review_date = null;
    await update.mutateAsync(payload);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Continuity Plan" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title" {...register("title")} />
        <Textarea label="Scope" rows={3} {...register("scope")} />
        <Textarea label="Objectives" rows={3} {...register("objectives")} />
        <Textarea label="Triggers" rows={3} {...register("triggers")} />
        <Textarea label="Procedures" rows={4} {...register("procedures")} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            options={[
              { value: "draft", label: "Draft" },
              { value: "approved", label: "Approved" },
              { value: "retired", label: "Retired" },
            ]}
            {...register("status")}
          />
          <Input label="Version" {...register("version")} />
        </div>
        <Input label="Review Date" type="date" {...register("review_date")} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Test Modal ───────────────────────────────────────────────────────────

interface AddTestModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
}

function AddTestModal({ open, onClose, planId }: AddTestModalProps) {
  const createTest = useCreateContinuityTest();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: { test_type: "", scheduled_date: "", completed_date: "", result: "", notes: "" },
  });

  async function onSubmit(values: TestFormValues) {
    await createTest.mutateAsync({ ...values, plan: planId });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule Continuity Test" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Test Type <span className="text-destructive">*</span>
          </label>
          <select
            {...register("test_type")}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select type...</option>
            <option value="tabletop">Tabletop Exercise</option>
            <option value="walkthrough">Walkthrough</option>
            <option value="simulation">Simulation</option>
            <option value="full_activation">Full Activation</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Test Date *" type="date" {...register("test_date")} />
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
        <Textarea label="Objectives" rows={3} {...register("objectives")} />
        <Textarea label="Result Summary" rows={3} {...register("result_summary")} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Schedule Test</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ContinuityPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);

  const { data: plan, isLoading, isError } = useContinuityPlan(id ?? "");
  const { data: tests } = useContinuityTests(id);

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  }

  if (isError || !plan) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load continuity plan.
      </div>
    );
  }

  const testList: ContinuityTest[] = Array.isArray(tests) ? tests : (tests as { results?: ContinuityTest[] } | undefined)?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/continuity")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{plan.title}</h1>
              <Badge variant={statusVariant(plan.status)}>
                {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">v{plan.version}</span>
            </div>
            {plan.owner_name && (
              <p className="text-sm text-muted-foreground mt-0.5">Owner: {plan.owner_name}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit Plan
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Review Date</span>
              <span>{plan.review_date ? new Date(plan.review_date).toLocaleDateString() : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approved At</span>
              <span>{plan.approved_at ? new Date(plan.approved_at).toLocaleDateString() : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Business Processes</span>
              <span>{plan.business_processes_count ?? plan.business_processes?.length ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        {plan.scope && (
          <Card>
            <CardHeader><CardTitle>Scope</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.scope}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Content sections */}
      {plan.objectives && (
        <Card>
          <CardHeader><CardTitle>Objectives</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.objectives}</p>
          </CardContent>
        </Card>
      )}

      {plan.triggers && (
        <Card>
          <CardHeader><CardTitle>Triggers</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.triggers}</p>
          </CardContent>
        </Card>
      )}

      {plan.procedures && (
        <Card>
          <CardHeader><CardTitle>Recovery Procedures</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.procedures}</p>
          </CardContent>
        </Card>
      )}

      {/* Tests section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Continuity Tests</h2>
          <Button size="sm" onClick={() => setTestModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Schedule Test
          </Button>
        </div>

        {testList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm text-muted-foreground">No tests scheduled. Add the first test.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Test Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Result Summary</th>
                </tr>
              </thead>
              <tbody>
                {testList.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 capitalize">{t.test_type?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.test_date}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status === "completed" ? "approved" : t.status === "cancelled" ? "destructive" : "not_assessed"}>
                        {t.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {t.result_summary || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editOpen && (
        <EditPlanModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          id={id!}
          defaultValues={{
            title: plan.title,
            scope: plan.scope ?? "",
            objectives: plan.objectives ?? "",
            triggers: plan.triggers ?? "",
            procedures: plan.procedures ?? "",
            status: plan.status as "draft" | "approved" | "retired",
            version: plan.version ?? "1.0",
            review_date: plan.review_date ?? "",
          }}
        />
      )}

      <AddTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        planId={id!}
      />
    </div>
  );
}
