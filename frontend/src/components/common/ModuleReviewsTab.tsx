/**
 * ModuleReviewsTab — Module-level reviews tab for Risks, Assets, Control Audits.
 *
 * Features:
 *  - Three sections: Current | Upcoming | Previous (closed)
 *  - Auto-review created when an object is added (shown immediately via refetch)
 *  - Manual review addition
 *  - Only "current" reviews are editable
 *  - Closing a review requires next_review_date → auto-creates next cycle
 *  - Maker/Checker (4-eyes) workflow: Submit → Approve/Reject
 *  - Clear visual state machine for each review
 */
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle, CalendarCheck2, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardCheck, ClipboardList, Clock, Edit2, Lock, Plus, Shield,
  Trash2, XCircle,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  useModuleReviews, useCreateReview, useUpdateReview, useDeleteReview,
  useSubmitReview, useApproveReview, useRejectReview,
  type Review,
} from "@/api/reviews";

// ─── Constants ────────────────────────────────────────────────────────────────

const REVIEW_TYPE_LABELS: Record<string, string> = {
  periodic: "Periodic", triggered: "Triggered", ad_hoc: "Ad Hoc",
  audit: "Internal Audit", management: "Management Review",
};

const OUTCOME_LABELS: Record<string, string> = {
  satisfactory: "Satisfactory", needs_improvement: "Needs Improvement",
  unsatisfactory: "Unsatisfactory", critical: "Critical", "": "Pending",
};

const OUTCOME_VARIANTS: Record<string, "low" | "medium" | "high" | "critical" | "default"> = {
  satisfactory: "low", needs_improvement: "medium",
  unsatisfactory: "high", critical: "critical", "": "default",
};

const WORKFLOW_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <Edit2 className="h-3 w-3" />,
  },
  submitted: {
    label: "Submitted — Awaiting Approval",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: "Approved (Closed)",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected — Revision Required",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="h-3 w-3" />,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ─── Review Form Modal ────────────────────────────────────────────────────────

const reviewSchema = z.object({
  review_type: z.enum(["periodic", "triggered", "ad_hoc", "audit", "management"]),
  review_date: z.string().min(1, "Review date is required"),
  outcome: z.enum(["satisfactory", "needs_improvement", "unsatisfactory", "critical", ""]),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  actions_required: z.string().optional(),
  evidence: z.string().optional(),
  next_review_date: z.string().optional(),
  object_repr: z.string().optional(),
});
type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormModalProps {
  open: boolean;
  review?: Review | null;
  contentTypeId: number;
  defaultObjectId?: string;
  defaultObjectRepr?: string;
  onClose: () => void;
}

function ReviewFormModal({
  open, review, contentTypeId, defaultObjectId, defaultObjectRepr, onClose,
}: ReviewFormModalProps) {
  const [selectedObjectId, setSelectedObjectId] = useState(review?.object_id ?? defaultObjectId ?? "");
  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview(review?.id ?? "");
  const isEditing = !!review;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      review_type: review?.review_type ?? "periodic",
      review_date: review?.review_date ?? new Date().toISOString().slice(0, 10),
      outcome: review?.outcome ?? "",
      findings: review?.findings ?? "",
      recommendations: review?.recommendations ?? "",
      actions_required: review?.actions_required ?? "",
      evidence: review?.evidence ?? "",
      next_review_date: review?.next_review_date ?? "",
      object_repr: review?.object_repr ?? defaultObjectRepr ?? "",
    },
  });

  async function onSubmit(values: ReviewFormValues) {
    const payload = {
      ...values,
      content_type: contentTypeId,
      object_id: selectedObjectId || review?.object_id,
      next_review_date: values.next_review_date || null,
    };
    if (isEditing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    reset();
    onClose();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Review" : "Add Review"} size="lg">
      <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <span className="font-semibold">Maker/Checker:</span> You (Maker) create this review draft.
        After submitting, an Approver (Checker) closes it. Closing automatically schedules the next review.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Review Type</label>
            <select {...register("review_type")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {Object.entries(REVIEW_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Review Date *</label>
            <Input type="date" {...register("review_date")} />
            {errors.review_date && <p className="text-xs text-red-600 mt-1">{errors.review_date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Outcome</label>
            <select {...register("outcome")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Pending</option>
              <option value="satisfactory">Satisfactory</option>
              <option value="needs_improvement">Needs Improvement</option>
              <option value="unsatisfactory">Unsatisfactory</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Next Review Date</label>
            <Input type="date" {...register("next_review_date")} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Findings</label>
          <Textarea {...register("findings")} rows={3} placeholder="Observations from this review…" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Recommendations</label>
          <Textarea {...register("recommendations")} rows={2} placeholder="Improvement recommendations…" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Actions Required</label>
          <Textarea {...register("actions_required")} rows={2} placeholder="Specific actions to be taken…" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Evidence</label>
          <Textarea {...register("evidence")} rows={2} placeholder="Evidence references or links…" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isPending}>
            {isEditing ? "Save Changes" : "Add Review"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Approve Modal (requires next_review_date) ────────────────────────────────

interface ApproveModalProps {
  open: boolean;
  review: Review | null;
  onClose: () => void;
}

function ApproveModal({ open, review, onClose }: ApproveModalProps) {
  const [nextDate, setNextDate] = useState(review?.next_review_date ?? "");
  const approveMutation = useApproveReview();

  async function handleApprove() {
    if (!review || !nextDate) return;
    await approveMutation.mutateAsync({ id: review.id, next_review_date: nextDate });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Close Review & Schedule Next" size="sm">
      <div className="space-y-4">
        <div className="p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-800">
          Approving this review will <strong>close it</strong> and automatically create the next review
          cycle using the date below.
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Next Review Date <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
          {!nextDate && (
            <p className="text-xs text-red-600 mt-1">Required — sets the date for the next review cycle.</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!nextDate}
            isLoading={approveMutation.isPending}
            onClick={handleApprove}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <ClipboardCheck className="h-4 w-4" />
            Approve & Close Review
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Review Row ───────────────────────────────────────────────────────────────

interface ReviewRowProps {
  review: Review;
  isCurrentReview: boolean;
  onEdit: (r: Review) => void;
  onDelete: (r: Review) => void;
  onApprove: (r: Review) => void;
  onReject: (r: Review) => void;
  onSubmit: (r: Review) => void;
}

function ReviewRow({ review, isCurrentReview, onEdit, onDelete, onApprove, onReject, onSubmit }: ReviewRowProps) {
  const [expanded, setExpanded] = useState(false);

  const wf = WORKFLOW_CONFIG[review.workflow_state] ?? WORKFLOW_CONFIG.draft;
  const isEditable = isCurrentReview && review.workflow_state === "draft";
  const canSubmit = isCurrentReview && review.workflow_state === "draft";
  const canApproveReject = review.workflow_state === "submitted";
  const isClosed = review.workflow_state === "approved";

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden transition-shadow",
      isCurrentReview && !isClosed
        ? "border-primary/30 bg-primary/5 shadow-sm"
        : isClosed
          ? "border-green-200 bg-green-50/30 dark:bg-green-950/10"
          : "border-border bg-card"
    )}>
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Period indicator */}
        <div className={cn(
          "shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
          review.period_status === "current" && !isClosed
            ? "bg-primary text-primary-foreground border-primary"
            : review.period_status === "upcoming"
              ? "bg-violet-100 text-violet-700 border-violet-200"
              : "bg-green-100 text-green-700 border-green-200"
        )}>
          {isClosed ? "Closed" : review.period_status === "upcoming" ? "Upcoming" : "Current"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            {/* Object name */}
            <span className="text-sm font-semibold text-foreground truncate max-w-xs">
              {review.object_repr || "—"}
            </span>
            <span className="text-xs text-muted-foreground">#{review.sequence_number}</span>

            {/* Workflow badge */}
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
              wf.color
            )}>
              {wf.icon}
              {wf.label}
            </span>

            {/* Review type */}
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
              {REVIEW_TYPE_LABELS[review.review_type]}
            </span>

            {/* Outcome */}
            {review.outcome && (
              <Badge variant={OUTCOME_VARIANTS[review.outcome] ?? "default"}>
                {OUTCOME_LABELS[review.outcome]}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>Review date: <span className="font-medium text-foreground">{formatDate(review.review_date)}</span></span>
            {review.next_review_date && (
              <span>Next: <span className="font-medium text-foreground">{formatDate(review.next_review_date)}</span></span>
            )}
            <span>Reviewer: <span className="font-medium text-foreground">{review.reviewer_name || review.reviewer}</span></span>
            {review.approver_name && (
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Approver: <span className="font-medium text-foreground">{review.approver_name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isEditable && (
            <Button size="sm" variant="ghost" onClick={() => onEdit(review)} title="Edit">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {isEditable && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(review)} title="Delete">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
          {canSubmit && (
            <Button size="sm" onClick={() => onSubmit(review)}>
              Submit for Approval
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApprove(review)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onReject(review)}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
          {isClosed && (
            <Lock className="h-4 w-4 text-muted-foreground" title="Closed — read only" />
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 text-sm bg-muted/20">
          {review.findings && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Findings</p>
              <p className="whitespace-pre-wrap text-foreground">{review.findings}</p>
            </div>
          )}
          {review.recommendations && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Recommendations</p>
              <p className="whitespace-pre-wrap text-foreground">{review.recommendations}</p>
            </div>
          )}
          {review.actions_required && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Actions Required</p>
              <p className="whitespace-pre-wrap text-foreground">{review.actions_required}</p>
            </div>
          )}
          {review.evidence && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Evidence</p>
              <p className="whitespace-pre-wrap text-foreground">{review.evidence}</p>
            </div>
          )}
          {review.rejection_reason && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
              <span className="font-medium">Rejection reason:</span> {review.rejection_reason}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
            {review.submitted_at && <span>Submitted: {formatDate(review.submitted_at)}</span>}
            {review.approved_at && <span>Approved/Closed: {formatDate(review.approved_at)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, color, count, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-sm font-semibold", color)}>
            {icon}
            {title}
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ModuleReviewsTabProps {
  /** Django ContentType id for this module */
  contentTypeId: number | undefined;
  /** Human-readable module name e.g. "Risk", "Asset" */
  moduleLabel: string;
}

export function ModuleReviewsTab({ contentTypeId, moduleLabel }: ModuleReviewsTabProps) {
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "current" | "upcoming" | "previous">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [approvingReview, setApprovingReview] = useState<Review | null>(null);
  const [rejectingReview, setRejectingReview] = useState<Review | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: allReviews = [], isLoading } = useModuleReviews(contentTypeId);
  const submitMutation = useSubmitReview();
  const rejectMutation = useRejectReview();
  const deleteMutation = useDeleteReview();

  // Group reviews by object; for each object, "current" = the most recent non-approved
  const currentReviewIds = useMemo(() => {
    const byObject = new Map<string, Review>();
    for (const r of allReviews) {
      if (r.workflow_state !== "approved") {
        const existing = byObject.get(r.object_id);
        if (!existing || r.review_date > existing.review_date) {
          byObject.set(r.object_id, r);
        }
      }
    }
    return new Set([...byObject.values()].map((r) => r.id));
  }, [allReviews]);

  // Filter + search
  const filteredReviews = useMemo(() => {
    let list = allReviews;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.object_repr.toLowerCase().includes(q) ||
          r.reviewer_name?.toLowerCase().includes(q) ||
          r.findings?.toLowerCase().includes(q)
      );
    }
    if (filterPeriod !== "all") {
      list = list.filter((r) => {
        if (filterPeriod === "current") return currentReviewIds.has(r.id) && r.workflow_state !== "approved";
        if (filterPeriod === "upcoming") return r.period_status === "upcoming";
        if (filterPeriod === "previous") return r.workflow_state === "approved";
        return true;
      });
    }
    return list;
  }, [allReviews, search, filterPeriod, currentReviewIds]);

  const currentReviews = filteredReviews.filter(
    (r) => currentReviewIds.has(r.id) && r.workflow_state !== "approved"
  );
  const upcomingReviews = filteredReviews.filter((r) => r.period_status === "upcoming");
  const previousReviews = filteredReviews.filter((r) => r.workflow_state === "approved");

  // Stats
  const pendingApproval = allReviews.filter((r) => r.workflow_state === "submitted").length;
  const overdue = allReviews.filter((r) => {
    const d = new Date(r.review_date);
    return r.workflow_state !== "approved" && d < new Date();
  }).length;

  function handleEdit(r: Review) {
    setEditingReview(r);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditingReview(null);
  }

  async function handleSubmit(r: Review) {
    await submitMutation.mutateAsync(r.id);
  }

  async function handleReject() {
    if (!rejectingReview || !rejectReason.trim()) return;
    await rejectMutation.mutateAsync({ id: rejectingReview.id, reason: rejectReason });
    setRejectingReview(null);
    setRejectReason("");
  }

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Reviews</span>
          </div>
          <p className="text-xl font-bold">{allReviews.length}</p>
        </div>
        <div className={cn("bg-card border rounded-lg p-3", pendingApproval > 0 ? "border-blue-300" : "border-border")}>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className={cn("h-3.5 w-3.5", pendingApproval > 0 ? "text-blue-500" : "text-muted-foreground")} />
            <span className="text-xs text-muted-foreground">Pending Approval</span>
          </div>
          <p className={cn("text-xl font-bold", pendingApproval > 0 && "text-blue-600")}>{pendingApproval}</p>
        </div>
        <div className={cn("bg-card border rounded-lg p-3", overdue > 0 ? "border-amber-300" : "border-border")}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle className={cn("h-3.5 w-3.5", overdue > 0 ? "text-amber-500" : "text-muted-foreground")} />
            <span className="text-xs text-muted-foreground">Overdue</span>
          </div>
          <p className={cn("text-xl font-bold", overdue > 0 && "text-amber-600")}>{overdue}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarCheck2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs text-muted-foreground">Closed</span>
          </div>
          <p className="text-xl font-bold text-green-600">{previousReviews.length}</p>
        </div>
      </div>

      {/* Maker/Checker workflow notice */}
      <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">ISO 27001:2022 §9.3 — Maker/Checker (4-eyes) Workflow:</span>{" "}
          Reviewer (Maker) creates and submits reviews. Approver (Checker) closes them.
          Closing a review requires a next review date — the next cycle is created automatically.
          Only the <strong>Current</strong> review for each {moduleLabel.toLowerCase()} is editable.
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search reviews…`}
            className="w-56"
          />
          <div className="flex border border-input rounded-md overflow-hidden text-xs">
            {(["all", "current", "upcoming", "previous"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={cn(
                  "px-3 py-1.5 font-medium capitalize transition-colors",
                  filterPeriod === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => { setEditingReview(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add Review
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading reviews…</div>
      ) : allReviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No reviews yet</p>
          <p className="text-xs mt-1">Reviews are created automatically when {moduleLabel}s are added, or you can add one manually.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current */}
          {(filterPeriod === "all" || filterPeriod === "current") && (
            <Section
              title="Current Reviews"
              icon={<ClipboardCheck className="h-4 w-4" />}
              color="text-primary"
              count={currentReviews.length}
              defaultOpen
            >
              {currentReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-2">No current reviews.</p>
              ) : (
                currentReviews.map((r) => (
                  <ReviewRow
                    key={r.id}
                    review={r}
                    isCurrentReview={currentReviewIds.has(r.id)}
                    onEdit={handleEdit}
                    onDelete={setDeletingReview}
                    onApprove={setApprovingReview}
                    onReject={setRejectingReview}
                    onSubmit={handleSubmit}
                  />
                ))
              )}
            </Section>
          )}

          {/* Upcoming */}
          {(filterPeriod === "all" || filterPeriod === "upcoming") && (
            <Section
              title="Upcoming Reviews"
              icon={<Clock className="h-4 w-4" />}
              color="text-violet-600"
              count={upcomingReviews.length}
              defaultOpen
            >
              {upcomingReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-2">No upcoming reviews scheduled.</p>
              ) : (
                upcomingReviews.map((r) => (
                  <ReviewRow
                    key={r.id}
                    review={r}
                    isCurrentReview={false}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onApprove={() => {}}
                    onReject={() => {}}
                    onSubmit={() => {}}
                  />
                ))
              )}
            </Section>
          )}

          {/* Previous (closed) */}
          {(filterPeriod === "all" || filterPeriod === "previous") && (
            <Section
              title="Previous Reviews (Closed)"
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="text-green-600"
              count={previousReviews.length}
              defaultOpen={false}
            >
              {previousReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-2">No closed reviews yet.</p>
              ) : (
                previousReviews.map((r) => (
                  <ReviewRow
                    key={r.id}
                    review={r}
                    isCurrentReview={false}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onApprove={() => {}}
                    onReject={() => {}}
                    onSubmit={() => {}}
                  />
                ))
              )}
            </Section>
          )}
        </div>
      )}

      {/* Review Form Modal */}
      <ReviewFormModal
        open={modalOpen}
        review={editingReview}
        contentTypeId={contentTypeId ?? 0}
        onClose={handleModalClose}
      />

      {/* Approve Modal */}
      <ApproveModal
        open={!!approvingReview}
        review={approvingReview}
        onClose={() => setApprovingReview(null)}
      />

      {/* Reject Modal */}
      <Modal
        open={!!rejectingReview}
        onClose={() => { setRejectingReview(null); setRejectReason(""); }}
        title="Reject Review"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Provide a reason so the Reviewer (Maker) can address the issues and resubmit.
          </p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Explain why this review is being rejected…"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRejectingReview(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              isLoading={rejectMutation.isPending}
              onClick={handleReject}
            >
              Reject Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deletingReview}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deletingReview) {
            await deleteMutation.mutateAsync(deletingReview);
            setDeletingReview(null);
          }
        }}
        onCancel={() => setDeletingReview(null)}
      />
    </div>
  );
}
