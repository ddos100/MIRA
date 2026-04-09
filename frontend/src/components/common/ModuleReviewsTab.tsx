/**
 * ModuleReviewsTab — Module-level reviews tab for Risks, Assets, Control Audits.
 *
 * Features:
 *  - Three clearly marked sections: Current | Upcoming | Previous (Closed)
 *  - Auto-review created when an object is added (backend signal)
 *  - Manual review addition with object selector + configurable Maker/Checker
 *  - Only the "current" (most recent non-approved) review per object is editable
 *  - Closing a review requires next_review_date → auto-creates next cycle
 *  - Maker/Checker (4-eyes) ISO 27001:2022 §9.3 workflow: Draft → Submit → Approve/Reject
 */
import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle, CalendarCheck2, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardCheck, ClipboardList, Clock, Edit2, Lock, Plus, Shield,
  Trash2, UserCheck, Users, XCircle,
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
import { useUsers, type UserDetail } from "@/api/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewableObject {
  id: string;
  label: string; // human-readable name shown in selector
}

interface ModuleReviewsTabProps {
  contentTypeId: number | undefined;
  moduleLabel: string;
  /** List of objects in this module so users can target a review at a specific item */
  objects?: ReviewableObject[];
}

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
    label: "Awaiting Approval",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: "Approved — Closed",
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

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function UserSelect({
  value, onChange, users, placeholder, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  users: UserDetail[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
    >
      <option value="">{placeholder}</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.display_name || `${u.first_name} ${u.last_name}`.trim() || u.email}
        </option>
      ))}
    </select>
  );
}

// ─── Review Form Modal ────────────────────────────────────────────────────────

const reviewSchema = z.object({
  object_id: z.string().min(1, "Please select the item being reviewed"),
  object_repr: z.string().optional(),
  reviewer: z.string().min(1, "Reviewer (Maker) is required"),
  approver: z.string().optional(),
  review_type: z.enum(["periodic", "triggered", "ad_hoc", "audit", "management"]),
  review_date: z.string().min(1, "Review date is required"),
  outcome: z.enum(["satisfactory", "needs_improvement", "unsatisfactory", "critical", ""]),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  actions_required: z.string().optional(),
  evidence: z.string().optional(),
  next_review_date: z.string().optional(),
});
type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormModalProps {
  open: boolean;
  review?: Review | null;
  contentTypeId: number;
  objects: ReviewableObject[];
  onClose: () => void;
}

function ReviewFormModal({ open, review, contentTypeId, objects, onClose }: ReviewFormModalProps) {
  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview(review?.id ?? "");
  const isEditing = !!review;

  const { data: usersData } = useUsers({ page_size: 200, is_active: true });
  const users: UserDetail[] = usersData?.results ?? [];

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } =
    useForm<ReviewFormValues>({
      resolver: zodResolver(reviewSchema),
      defaultValues: {
        object_id: review?.object_id ?? "",
        object_repr: review?.object_repr ?? "",
        reviewer: review?.reviewer ?? "",
        approver: review?.approver ?? "",
        review_type: review?.review_type ?? "periodic",
        review_date: review?.review_date ?? new Date().toISOString().slice(0, 10),
        outcome: review?.outcome ?? "",
        findings: review?.findings ?? "",
        recommendations: review?.recommendations ?? "",
        actions_required: review?.actions_required ?? "",
        evidence: review?.evidence ?? "",
        next_review_date: review?.next_review_date ?? "",
      },
    });

  const selectedObjectId = watch("object_id");

  // Auto-fill object_repr when object is selected
  function handleObjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setValue("object_id", id);
    const obj = objects.find((o) => o.id === id);
    if (obj) setValue("object_repr", obj.label);
  }

  async function onSubmit(values: ReviewFormValues) {
    // Ensure object_repr is populated
    if (!values.object_repr) {
      const obj = objects.find((o) => o.id === values.object_id);
      values.object_repr = obj?.label ?? values.object_id;
    }
    const payload = {
      ...values,
      content_type: contentTypeId,
      approver: values.approver || null,
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
      {/* Maker/Checker notice */}
      <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800 flex gap-2">
        <Shield className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <div>
          <span className="font-semibold">Maker/Checker (4-eyes) Workflow:</span>{" "}
          The <strong>Reviewer (Maker)</strong> creates and submits this review.
          The <strong>Approver (Checker)</strong> then closes it.
          Closing automatically schedules the next review cycle.
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Object selection ── */}
        <div className="p-3 rounded-md border border-border bg-muted/30 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item Being Reviewed</p>
          {isEditing ? (
            <p className="text-sm font-medium text-foreground">{review?.object_repr || review?.object_id}</p>
          ) : (
            <div>
              {objects.length > 0 ? (
                <select
                  value={selectedObjectId}
                  onChange={handleObjectChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Select item —</option>
                  {objects.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <Input {...register("object_id")} placeholder="Object ID (UUID)" />
              )}
              {errors.object_id && (
                <p className="text-xs text-red-600 mt-1">{errors.object_id.message}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Maker/Checker assignment ── */}
        <div className="p-3 rounded-md border border-border bg-muted/30 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Maker / Checker Assignment
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Reviewer — Maker <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="reviewer"
                render={({ field }) => (
                  <UserSelect
                    value={field.value}
                    onChange={field.onChange}
                    users={users}
                    placeholder="Select Maker"
                  />
                )}
              />
              {errors.reviewer && (
                <p className="text-xs text-red-600 mt-1">{errors.reviewer.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Creates &amp; submits the review</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Approver — Checker
              </label>
              <Controller
                control={control}
                name="approver"
                render={({ field }) => (
                  <UserSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    users={users}
                    placeholder="Select Checker (optional)"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-0.5">Approves &amp; closes the review</p>
            </div>
          </div>
        </div>

        {/* ── Review details ── */}
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
            <label className="block text-sm font-medium mb-1">Review Date <span className="text-red-500">*</span></label>
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Recommendations</label>
            <Textarea {...register("recommendations")} rows={2} placeholder="Improvements recommended…" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Actions Required</label>
            <Textarea {...register("actions_required")} rows={2} placeholder="Actions to be taken…" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Evidence</label>
          <Textarea {...register("evidence")} rows={2} placeholder="Evidence references or document links…" />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
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

  // Reset date when review changes
  if (review?.next_review_date && !nextDate) setNextDate(review.next_review_date);

  async function handleApprove() {
    if (!review || !nextDate) return;
    await approveMutation.mutateAsync({ id: review.id, next_review_date: nextDate });
    setNextDate("");
    onClose();
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setNextDate(""); }} title="Close Review & Schedule Next Cycle" size="sm">
      <div className="space-y-4">
        <div className="p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-800">
          Approving <strong>closes</strong> this review and automatically creates the next review cycle
          with the date below. The next review will be in <em>Draft</em> status ready for the Maker.
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
            <p className="text-xs text-red-600 mt-1">Required — sets when the next review cycle starts.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => { onClose(); setNextDate(""); }}>Cancel</Button>
          <Button
            disabled={!nextDate}
            isLoading={approveMutation.isPending}
            onClick={handleApprove}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <ClipboardCheck className="h-4 w-4" />
            Approve &amp; Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Workflow Status Bar ──────────────────────────────────────────────────────

function WorkflowBar({ state }: { state: string }) {
  const steps = ["draft", "submitted", "approved"] as const;
  const idx = steps.indexOf(state as typeof steps[number]);
  const isRejected = state === "rejected";

  return (
    <div className="flex items-center gap-0 text-xs">
      {steps.map((s, i) => {
        const done = isRejected ? false : i < idx;
        const active = isRejected ? s === "submitted" : i === idx;
        return (
          <div key={s} className="flex items-center">
            <div className={cn(
              "px-2 py-0.5 rounded text-xs font-medium border",
              done ? "bg-green-100 text-green-700 border-green-200" :
              active && isRejected ? "bg-red-100 text-red-700 border-red-200" :
              active ? "bg-blue-100 text-blue-700 border-blue-200 ring-1 ring-blue-300" :
              "bg-muted text-muted-foreground border-border"
            )}>
              {s === "approved" ? "Closed" : s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-4 h-px", done ? "bg-green-300" : "bg-border")} />
            )}
          </div>
        );
      })}
      {isRejected && (
        <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
          Rejected
        </span>
      )}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  isCurrentReview: boolean;
  onEdit: (r: Review) => void;
  onDelete: (r: Review) => void;
  onApprove: (r: Review) => void;
  onReject: (r: Review) => void;
  onSubmit: (id: string) => void;
}

function ReviewCard({ review, isCurrentReview, onEdit, onDelete, onApprove, onReject, onSubmit }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const submitMutation = useSubmitReview();

  const isClosed = review.workflow_state === "approved";
  const isEditable = isCurrentReview && review.workflow_state === "draft";
  const canSubmit = isCurrentReview && review.workflow_state === "draft";
  const canApproveReject = review.workflow_state === "submitted";

  // Period badge config
  const periodConfig = isClosed
    ? { label: "Closed", cls: "bg-green-100 text-green-700 border-green-200" }
    : review.period_status === "upcoming"
      ? { label: "Upcoming", cls: "bg-violet-100 text-violet-700 border-violet-200" }
      : { label: "Current", cls: "bg-primary/10 text-primary border-primary/30 font-bold" };

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden transition-shadow hover:shadow-sm",
      isCurrentReview && !isClosed ? "border-primary/40 shadow-sm" :
      isClosed ? "border-green-200 opacity-80" :
      "border-border"
    )}>
      {/* Main row */}
      <div className={cn(
        "flex items-start gap-3 px-4 py-3",
        isCurrentReview && !isClosed ? "bg-primary/5" :
        isClosed ? "bg-green-50/40" :
        "bg-card"
      )}>
        {/* Period tag */}
        <div className={cn(
          "shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border",
          periodConfig.cls
        )}>
          {periodConfig.label}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate max-w-sm">
              {review.object_repr || "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              Review #{review.sequence_number}
            </span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {REVIEW_TYPE_LABELS[review.review_type]}
            </span>
            {review.outcome && (
              <Badge variant={OUTCOME_VARIANTS[review.outcome] ?? "default"} className="text-xs">
                {OUTCOME_LABELS[review.outcome]}
              </Badge>
            )}
          </div>

          {/* Workflow bar */}
          <WorkflowBar state={review.workflow_state} />

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>
              Date: <span className="font-medium text-foreground">{fmt(review.review_date)}</span>
            </span>
            {review.next_review_date && (
              <span>
                Next: <span className="font-medium text-foreground">{fmt(review.next_review_date)}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Maker: <span className="font-medium text-foreground">{review.reviewer_name || "—"}</span>
            </span>
            {review.approver_name && (
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Checker: <span className="font-medium text-foreground">{review.approver_name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {isEditable && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onEdit(review)} title="Edit">
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(review)} title="Delete">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </>
          )}
          {canSubmit && (
            <Button
              size="sm"
              onClick={() => onSubmit(review.id)}
              isLoading={submitMutation.isPending}
            >
              Submit for Approval
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApprove(review)}
                title="Approve & close review"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onReject(review)}
                title="Reject — return to maker"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
          {isClosed && (
            <Lock className="h-4 w-4 text-muted-foreground mx-1" title="Closed — read only" />
          )}
          {!isEditable && !canSubmit && !canApproveReject && !isClosed && (
            <Lock className="h-4 w-4 text-muted-foreground mx-1" title="Upcoming — not yet editable" />
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Toggle details"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 text-sm bg-muted/20">
          {review.findings ? (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Findings</p>
              <p className="text-foreground whitespace-pre-wrap">{review.findings}</p>
            </div>
          ) : null}
          {review.recommendations ? (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recommendations</p>
              <p className="text-foreground whitespace-pre-wrap">{review.recommendations}</p>
            </div>
          ) : null}
          {review.actions_required ? (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Actions Required</p>
              <p className="text-foreground whitespace-pre-wrap">{review.actions_required}</p>
            </div>
          ) : null}
          {review.evidence ? (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Evidence</p>
              <p className="text-foreground whitespace-pre-wrap">{review.evidence}</p>
            </div>
          ) : null}
          {review.rejection_reason && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
              <span className="font-semibold">Rejection reason:</span> {review.rejection_reason}
            </div>
          )}
          {!review.findings && !review.recommendations && !review.actions_required && !review.evidence && !review.rejection_reason && (
            <p className="text-xs text-muted-foreground italic">No findings recorded yet.</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
            {review.submitted_at && <span>Submitted: {fmt(review.submitted_at)}</span>}
            {review.approved_at && <span>Closed: {fmt(review.approved_at)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, icon, titleColor, count, children, defaultOpen = true,
}: {
  title: string; icon: React.ReactNode; titleColor: string;
  count: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <span className={cn("flex items-center gap-2 text-sm font-semibold", titleColor)}>
          {icon}
          {title}
          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 pl-0">
          {count === 0
            ? <p className="text-sm text-muted-foreground pl-2 py-2 italic">None.</p>
            : children}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ModuleReviewsTab({ contentTypeId, moduleLabel, objects = [] }: ModuleReviewsTabProps) {
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

  // For each object_id, "current" = most recent non-approved review
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

  // Filtered list
  const filtered = useMemo(() => {
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

  const currentList = filtered.filter((r) => currentReviewIds.has(r.id) && r.workflow_state !== "approved");
  const upcomingList = filtered.filter((r) => r.period_status === "upcoming");
  const previousList = filtered.filter((r) => r.workflow_state === "approved");

  // Stats
  const pendingApproval = allReviews.filter((r) => r.workflow_state === "submitted").length;
  const overdueCount = allReviews.filter((r) => {
    if (r.workflow_state === "approved") return false;
    return new Date(r.review_date) < new Date();
  }).length;

  function openCreate() { setEditingReview(null); setModalOpen(true); }
  function handleModalClose() { setModalOpen(false); setEditingReview(null); }
  function handleEdit(r: Review) { setEditingReview(r); setModalOpen(true); }

  async function handleSubmit(id: string) {
    await submitMutation.mutateAsync(id);
  }

  async function handleReject() {
    if (!rejectingReview || !rejectReason.trim()) return;
    await rejectMutation.mutateAsync({ id: rejectingReview.id, reason: rejectReason });
    setRejectingReview(null);
    setRejectReason("");
  }

  return (
    <div className="space-y-5">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Reviews", value: allReviews.length, icon: <ClipboardList className="h-4 w-4 text-muted-foreground" />, highlight: "" },
          { label: "Pending Approval", value: pendingApproval, icon: <Clock className="h-4 w-4 text-blue-500" />, highlight: pendingApproval > 0 ? "text-blue-600" : "" },
          { label: "Overdue", value: overdueCount, icon: <AlertCircle className="h-4 w-4 text-amber-500" />, highlight: overdueCount > 0 ? "text-amber-600" : "" },
          { label: "Closed", value: previousList.length, icon: <CalendarCheck2 className="h-4 w-4 text-green-500" />, highlight: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-xs text-muted-foreground">{s.label}</span></div>
            <p className={cn("text-2xl font-bold", s.highlight)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Workflow guide ── */}
      <div className="p-3 rounded-md border border-blue-200 bg-blue-50 text-xs text-blue-800 flex gap-2 items-start">
        <Shield className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <div>
          <span className="font-semibold">ISO 27001:2022 §9.3 — Maker/Checker (4-eyes):</span>{" "}
          <strong>Maker</strong> (Reviewer) creates the draft and submits.{" "}
          <strong>Checker</strong> (Approver) approves or rejects.{" "}
          Approving <em>closes</em> the review and auto-schedules the next cycle.{" "}
          Only the <strong className="underline">Current</strong> review per {moduleLabel.toLowerCase()} is editable.
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search reviews…" className="w-56" />
          <div className="flex border border-input rounded-md overflow-hidden text-xs font-medium">
            {(["all", "current", "upcoming", "previous"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={cn(
                  "px-3 py-1.5 capitalize transition-colors",
                  filterPeriod === p ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Review
        </Button>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading reviews…</div>
      ) : allReviews.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg space-y-2">
          <ClipboardList className="h-10 w-10 mx-auto opacity-25" />
          <p className="text-sm font-medium text-muted-foreground">No reviews yet</p>
          <p className="text-xs text-muted-foreground">
            Reviews are created automatically when {moduleLabel}s are added, or add one manually.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current */}
          {(filterPeriod === "all" || filterPeriod === "current") && (
            <Section
              title="Current Reviews"
              icon={<ClipboardCheck className="h-4 w-4" />}
              titleColor="text-primary"
              count={currentList.length}
              defaultOpen
            >
              {currentList.map((r) => (
                <ReviewCard key={r.id} review={r} isCurrentReview
                  onEdit={handleEdit} onDelete={setDeletingReview}
                  onApprove={setApprovingReview} onReject={setRejectingReview}
                  onSubmit={handleSubmit}
                />
              ))}
            </Section>
          )}

          {/* Upcoming */}
          {(filterPeriod === "all" || filterPeriod === "upcoming") && (
            <Section
              title="Upcoming Reviews"
              icon={<Clock className="h-4 w-4" />}
              titleColor="text-violet-600"
              count={upcomingList.length}
              defaultOpen
            >
              {upcomingList.map((r) => (
                <ReviewCard key={r.id} review={r} isCurrentReview={false}
                  onEdit={() => {}} onDelete={() => {}} onApprove={() => {}} onReject={() => {}} onSubmit={() => {}}
                />
              ))}
            </Section>
          )}

          {/* Previous / Closed */}
          {(filterPeriod === "all" || filterPeriod === "previous") && (
            <Section
              title="Previous Reviews (Closed)"
              icon={<CheckCircle2 className="h-4 w-4" />}
              titleColor="text-green-600"
              count={previousList.length}
              defaultOpen={false}
            >
              {previousList.map((r) => (
                <ReviewCard key={r.id} review={r} isCurrentReview={false}
                  onEdit={() => {}} onDelete={() => {}} onApprove={() => {}} onReject={() => {}} onSubmit={() => {}}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <ReviewFormModal
        open={modalOpen}
        review={editingReview}
        contentTypeId={contentTypeId ?? 0}
        objects={objects}
        onClose={handleModalClose}
      />

      <ApproveModal
        open={!!approvingReview}
        review={approvingReview}
        onClose={() => setApprovingReview(null)}
      />

      <Modal
        open={!!rejectingReview}
        onClose={() => { setRejectingReview(null); setRejectReason(""); }}
        title="Reject Review — Return to Maker"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Provide a reason so the Reviewer (Maker) can address the issues and resubmit.
          </p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
            placeholder="Explain why this review is being rejected…" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRejectingReview(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} isLoading={rejectMutation.isPending} onClick={handleReject}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingReview}
        title="Delete Review"
        description="Delete this review? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deletingReview) { await deleteMutation.mutateAsync(deletingReview); setDeletingReview(null); }
        }}
        onCancel={() => setDeletingReview(null)}
      />
    </div>
  );
}
