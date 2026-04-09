/**
 * GoalsPage — Measurable organizational goals with periodic audit and review.
 * Aligned to ISO 27001:2022 §6.2 (Information Security Objectives) and §9.1–9.3.
 * Implements Maker/Checker (4-eyes) principle for review approvals.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2, ChevronDown, ChevronUp, Clock, Edit2, Plus,
  ShieldCheck, Target, Trash2, TrendingUp, XCircle,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal,
  useGoalCategories, useGoalReviews, useCreateGoalReview,
  useUpdateGoalReview, useSubmitGoalReview, useApproveGoalReview, useRejectGoalReview,
  type Goal, type GoalReview,
} from "@/api/goals";
import { useContentTypes } from "@/api/automatedActions";
import { ModuleStatusRulesTab } from "@/components/common/ModuleStatusRulesTab";

// ─── Constants ────────────────────────────────────────────────────────────────

const ISO_CLAUSES = [
  { value: "6.2", label: "6.2 — Information Security Objectives" },
  { value: "9.1", label: "9.1 — Monitoring, Measurement, Analysis and Evaluation" },
  { value: "9.2", label: "9.2 — Internal Audit" },
  { value: "9.3", label: "9.3 — Management Review" },
  { value: "10.1", label: "10.1 — Continual Improvement" },
  { value: "5.1", label: "5.1 — Leadership and Commitment" },
  { value: "6.1", label: "6.1 — Actions to Address Risks and Opportunities" },
  { value: "8.1", label: "8.1 — Operational Planning and Control" },
  { value: "A.5", label: "A.5 — Organisational Controls" },
  { value: "A.6", label: "A.6 — People Controls" },
  { value: "A.8", label: "A.8 — Technological Controls" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-blue-100 text-blue-700",
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-amber-100 text-amber-700",
  behind: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const OUTCOME_COLORS: Record<string, string> = {
  on_track: "text-green-600",
  at_risk: "text-amber-600",
  behind: "text-red-600",
  completed: "text-emerald-600",
  cancelled: "text-gray-500",
};

const WORKFLOW_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  objective: z.string().optional(),
  measurable_target: z.string().optional(),
  unit: z.string().optional(),
  baseline_value: z.coerce.number().optional().nullable(),
  target_value: z.coerce.number().optional().nullable(),
  current_value: z.coerce.number().optional().nullable(),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(["draft", "active", "on_track", "at_risk", "behind", "completed", "cancelled"]),
  iso27001_clause: z.string().optional(),
  review_frequency: z.enum(["monthly", "quarterly", "biannual", "annual", "ad_hoc"]),
  notes: z.string().optional(),
});
type GoalForm = z.infer<typeof goalSchema>;

const reviewSchema = z.object({
  review_date: z.string().min(1, "Date required"),
  current_value: z.coerce.number().optional().nullable(),
  outcome: z.enum(["on_track", "at_risk", "behind", "completed", "cancelled"]),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  actions_required: z.string().optional(),
  next_review_date: z.string().optional(),
});
type ReviewForm = z.infer<typeof reviewSchema>;

// ─── Goal Form Modal ──────────────────────────────────────────────────────────

function GoalFormModal({
  open, onClose, editData,
}: {
  open: boolean; onClose: () => void; editData?: Goal | null;
}) {
  const { data: categories = [] } = useGoalCategories();
  const create = useCreateGoal();
  const update = useUpdateGoal(editData?.id ?? "");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: editData ? {
      title: editData.title,
      description: editData.description,
      objective: editData.objective,
      measurable_target: editData.measurable_target,
      unit: editData.unit,
      baseline_value: editData.baseline_value,
      target_value: editData.target_value,
      current_value: editData.current_value,
      start_date: editData.start_date ?? "",
      target_date: editData.target_date ?? "",
      status: editData.status,
      iso27001_clause: editData.iso27001_clause,
      review_frequency: editData.review_frequency,
      notes: editData.notes,
    } : { status: "active", review_frequency: "quarterly", iso27001_clause: "6.2" },
  });

  const onSubmit = async (values: GoalForm) => {
    const payload = {
      ...values,
      baseline_value: values.baseline_value ?? null,
      target_value: values.target_value ?? null,
      current_value: values.current_value ?? null,
    };
    if (editData) {
      await update.mutateAsync(payload);
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Goal" : "New Goal"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <Input {...register("title")} placeholder="e.g. Reduce critical vulnerabilities to zero" />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Objective</label>
            <Textarea {...register("objective")} rows={2} placeholder="What specific outcome will be achieved?" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea {...register("description")} rows={2} />
          </div>

          {/* Measurable target */}
          <div className="col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Measurable Target (ISO 27001:2022 §6.2 — SMART Objectives)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium">Target Description</label>
                <Input {...register("measurable_target")} placeholder="e.g. 99.9% uptime, <5 open criticals" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Unit</label>
                <Input {...register("unit")} placeholder="%, count, hours…" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Baseline Value</label>
                <Input type="number" step="any" {...register("baseline_value")} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Target Value</label>
                <Input type="number" step="any" {...register("target_value")} placeholder="100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Current Value</label>
                <Input type="number" step="any" {...register("current_value")} placeholder="—" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Start Date</label>
            <Input type="date" {...register("start_date")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target Date</label>
            <Input type="date" {...register("target_date")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select {...register("status")} className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {["draft","active","on_track","at_risk","behind","completed","cancelled"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Review Frequency</label>
            <select {...register("review_frequency")} className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {[["monthly","Monthly"],["quarterly","Quarterly"],["biannual","Bi-Annual"],["annual","Annual"],["ad_hoc","Ad Hoc"]].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">ISO 27001:2022 Clause</label>
            <select {...register("iso27001_clause")} className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">— Select clause —</option>
              {ISO_CLAUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <Textarea {...register("notes")} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : editData ? "Save Changes" : "Create Goal"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Goal Review Modal ────────────────────────────────────────────────────────

function GoalReviewModal({
  open, onClose, goalId, goalTitle, editData,
}: {
  open: boolean; onClose: () => void; goalId: string; goalTitle: string; editData?: GoalReview | null;
}) {
  const create = useCreateGoalReview();
  const update = useUpdateGoalReview(editData?.id ?? "");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: editData ? {
      review_date: editData.review_date,
      current_value: editData.current_value,
      outcome: editData.outcome,
      findings: editData.findings,
      recommendations: editData.recommendations,
      actions_required: editData.actions_required,
      next_review_date: editData.next_review_date ?? "",
    } : {
      review_date: new Date().toISOString().split("T")[0],
      outcome: "on_track",
    },
  });

  const onSubmit = async (values: ReviewForm) => {
    const payload = { ...values, goal: goalId, current_value: values.current_value ?? null };
    if (editData) {
      await update.mutateAsync(payload);
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Review: ${goalTitle}`} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Review Date *</label>
            <Input type="date" {...register("review_date")} />
            {errors.review_date && <p className="mt-1 text-xs text-destructive">{errors.review_date.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Current Value</label>
            <Input type="number" step="any" {...register("current_value")} placeholder="Measured value" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Outcome *</label>
            <select {...register("outcome")} className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {[["on_track","On Track"],["at_risk","At Risk"],["behind","Behind Schedule"],["completed","Completed"],["cancelled","Cancelled"]].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Next Review Date</label>
            <Input type="date" {...register("next_review_date")} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Findings</label>
          <Textarea {...register("findings")} rows={3} placeholder="Key observations and evidence gathered during this review..." />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Recommendations</label>
          <Textarea {...register("recommendations")} rows={2} placeholder="Recommended actions to improve goal performance..." />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Actions Required</label>
          <Textarea {...register("actions_required")} rows={2} placeholder="Specific corrective or improvement actions..." />
        </div>
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          <strong>Maker/Checker:</strong> Save as Draft first, then submit for approval. A Checker (approver) must approve before the review is finalised.
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : editData ? "Save Changes" : "Save Draft"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, status }: { pct: number | null; status: string }) {
  if (pct === null) return null;
  const color = status === "behind" ? "bg-red-500" : status === "at_risk" ? "bg-amber-500" : status === "completed" ? "bg-emerald-500" : "bg-primary";
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Progress</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review, onEdit }: { review: GoalReview; onEdit: () => void }) {
  const submit = useSubmitGoalReview();
  const approve = useApproveGoalReview();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const reject = useRejectGoalReview();

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {new Date(review.review_date).toLocaleDateString()}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", WORKFLOW_BADGE[review.workflow_state])}>
              {review.workflow_state.replace(/_/g, " ")}
            </span>
            {review.outcome && (
              <span className={cn("text-xs font-medium", OUTCOME_COLORS[review.outcome])}>
                {review.outcome.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reviewer: {review.reviewer_name}
            {review.approver_name && ` · Approved by: ${review.approver_name}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {review.workflow_state === "draft" && (
            <>
              <Button size="sm" variant="ghost" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => submit.mutate(review.id)} isLoading={submit.isPending}>
                Submit
              </Button>
            </>
          )}
          {review.workflow_state === "submitted" && (
            <>
              <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => approve.mutate(review.id)} isLoading={approve.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-3.5 w-3.5 mr-1" />Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {review.findings && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Findings</p>
          <p className="text-sm">{review.findings}</p>
        </div>
      )}
      {review.recommendations && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Recommendations</p>
          <p className="text-sm">{review.recommendations}</p>
        </div>
      )}
      {review.actions_required && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Actions Required</p>
          <p className="text-sm">{review.actions_required}</p>
        </div>
      )}
      {review.rejection_reason && (
        <div className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <strong>Rejection reason:</strong> {review.rejection_reason}
        </div>
      )}

      {/* Reject modal */}
      {rejectOpen && (
        <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Review" size="sm">
          <div className="space-y-4">
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection..." />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button
                className="bg-destructive text-destructive-foreground"
                onClick={async () => {
                  await reject.mutateAsync({ id: review.id, reason: rejectReason });
                  setRejectOpen(false);
                }}
                isLoading={reject.isPending}
              >
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<GoalReview | null>(null);
  const deleteGoal = useDeleteGoal();
  const { data: reviews = [] } = useGoalReviews(expanded ? goal.id : undefined);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{goal.title}</h3>
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[goal.status])}>
                {goal.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              {goal.iso27001_clause && (
                <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-mono">
                  ISO §{goal.iso27001_clause}
                </span>
              )}
            </div>
            {goal.objective && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{goal.objective}</p>}
            {goal.measurable_target && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium">{goal.measurable_target}</span>
                {goal.target_value !== null && (
                  <span className="text-xs text-muted-foreground">
                    {goal.current_value !== null ? `${goal.current_value}` : "—"} / {goal.target_value} {goal.unit}
                  </span>
                )}
              </div>
            )}
            <ProgressBar pct={goal.progress_pct} status={goal.status} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => deleteGoal.mutate(goal.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {goal.owner_name && <span>Owner: {goal.owner_name}</span>}
          {goal.business_unit_name && <span>BU: {goal.business_unit_name}</span>}
          {goal.target_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Target: {new Date(goal.target_date).toLocaleDateString()}</span>}
          {goal.next_review_date && <span>Next review: {new Date(goal.next_review_date).toLocaleDateString()}</span>}
          <span>Review: {goal.review_frequency}</span>
          {goal.review_count > 0 && <span>{goal.review_count} review{goal.review_count !== 1 ? "s" : ""}</span>}
        </div>
      </div>

      {/* Reviews section */}
      <div className="border-t border-border/60">
        <button
          className="w-full flex items-center justify-between px-5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Reviews & Audit History
            {goal.review_count > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-primary font-semibold">{goal.review_count}</span>
            )}
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="px-5 pb-4 space-y-3">
            {reviews.length === 0 && (
              <p className="text-xs text-muted-foreground py-1">No reviews yet.</p>
            )}
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                onEdit={() => { setEditingReview(r); setReviewModalOpen(true); }}
              />
            ))}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => { setEditingReview(null); setReviewModalOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />Add Review
            </Button>
          </div>
        )}
      </div>

      {reviewModalOpen && (
        <GoalReviewModal
          open={reviewModalOpen}
          onClose={() => { setReviewModalOpen(false); setEditingReview(null); }}
          goalId={goal.id}
          goalTitle={goal.title}
          editData={editingReview}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "goals" | "status_rules";

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("goals");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: goals = [], isLoading } = useGoals(
    statusFilter ? { status: statusFilter } : undefined
  );
  const filtered = search
    ? goals.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()) || g.iso27001_clause?.includes(search))
    : goals;

  const stats = {
    total: goals.length,
    on_track: goals.filter((g) => g.status === "on_track" || g.status === "active").length,
    at_risk: goals.filter((g) => g.status === "at_risk" || g.status === "behind").length,
    completed: goals.filter((g) => g.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals & Objectives"
        description="Measurable organisational and information security goals aligned to ISO 27001:2022 §6.2. All reviews follow Maker/Checker approval workflow."
        actions={
          activeTab === "goals" ? (
            <Button onClick={() => { setEditingGoal(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4" />New Goal
            </Button>
          ) : null
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Goals", value: stats.total, icon: Target, color: "text-foreground" },
          { label: "On Track", value: stats.on_track, icon: CheckCircle2, color: "text-green-600" },
          { label: "At Risk / Behind", value: stats.at_risk, icon: ShieldCheck, color: "text-red-600" },
          { label: "Completed", value: stats.completed, icon: TrendingUp, color: "text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn("h-4 w-4", color)} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b">
        {([["goals", "Goals"], ["status_rules", "Status Rules"]] as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "status_rules" && (
        <ModuleStatusRulesTab contentTypeLabel="goals.goal" moduleLabel="Goal" />
      )}

      {activeTab === "goals" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              placeholder="Search goals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-56"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              {["draft","active","on_track","at_risk","behind","completed","cancelled"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No goals defined yet.</p>
              <button className="mt-2 text-xs text-primary hover:underline" onClick={() => setModalOpen(true)}>
                Create the first goal →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onEdit={() => { setEditingGoal(g); setModalOpen(true); }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <GoalFormModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingGoal(null); }}
          editData={editingGoal}
        />
      )}
    </div>
  );
}
