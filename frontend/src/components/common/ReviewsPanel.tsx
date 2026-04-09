/**
 * ReviewsPanel — Generic review panel for any GRC object.
 * Implements Maker/Checker (4-eyes principle) workflow:
 *   Maker creates/submits review → Checker approves/rejects.
 * Used on Risk, Asset, Control detail views.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2, ChevronDown, ChevronUp, ClipboardList,
  Edit2, Plus, ShieldCheck, Trash2, XCircle,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useReviews, useCreateReview, useUpdateReview, useDeleteReview,
  useSubmitReview, useApproveReview, useRejectReview,
  type Review,
} from "@/api/reviews";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewsPanelProps {
  /** Django ContentType id for the parent model */
  contentTypeId: number;
  /** UUID of the parent object */
  objectId: string;
  /** Label for the module, e.g. "Risk" or "Asset" */
  moduleLabel?: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const reviewSchema = z.object({
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OUTCOME_LABELS: Record<string, string> = {
  satisfactory: "Satisfactory",
  needs_improvement: "Needs Improvement",
  unsatisfactory: "Unsatisfactory",
  critical: "Critical",
  "": "Pending",
};

const OUTCOME_VARIANTS: Record<string, "low" | "medium" | "high" | "critical" | "default"> = {
  satisfactory: "low",
  needs_improvement: "medium",
  unsatisfactory: "high",
  critical: "critical",
  "": "default",
};

const WORKFLOW_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

const WORKFLOW_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const REVIEW_TYPE_LABELS: Record<string, string> = {
  periodic: "Periodic",
  triggered: "Triggered",
  ad_hoc: "Ad Hoc",
  audit: "Audit",
  management: "Management Review",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ─── Review Form Modal ────────────────────────────────────────────────────────

interface ReviewFormModalProps {
  open: boolean;
  review?: Review | null;
  contentTypeId: number;
  objectId: string;
  onClose: () => void;
}

function ReviewFormModal({ open, review, contentTypeId, objectId, onClose }: ReviewFormModalProps) {
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
    },
  });

  async function onSubmit(values: ReviewFormValues) {
    const payload = {
      ...values,
      content_type: contentTypeId,
      object_id: objectId,
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
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Review" : "Add Review"}
      size="lg"
    >
      <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <span className="font-semibold">Maker/Checker Workflow:</span> You (Maker) create this review.
        After submitting, an Approver (Checker) will review and approve or reject it per ISO 27001:2022 §9.3.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Review Type</label>
            <select
              {...register("review_type")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
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
            <select
              {...register("outcome")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
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
          <Textarea {...register("findings")} rows={3} placeholder="Observations and findings from this review…" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Recommendations</label>
          <Textarea {...register("recommendations")} rows={2} placeholder="Recommendations for improvement…" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Actions Required</label>
          <Textarea {...register("actions_required")} rows={2} placeholder="Specific actions that must be taken…" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Evidence</label>
          <Textarea {...register("evidence")} rows={2} placeholder="Evidence references or documentation links…" />
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

// ─── Review Card ──────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  contentTypeId: number;
  objectId: string;
  onEdit: (r: Review) => void;
  onDelete: (r: Review) => void;
}

function ReviewCard({ review, contentTypeId, objectId, onEdit, onDelete }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const submitMutation = useSubmitReview();
  const approveMutation = useApproveReview();
  const rejectMutation = useRejectReview();

  async function handleApprove() {
    await approveMutation.mutateAsync(review.id);
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    await rejectMutation.mutateAsync({ id: review.id, reason: rejectReason });
    setRejectOpen(false);
    setRejectReason("");
  }

  async function handleSubmit() {
    await submitMutation.mutateAsync(review.id);
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <ClipboardList className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{formatDate(review.review_date)}</span>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                WORKFLOW_COLORS[review.workflow_state]
              )}>
                {WORKFLOW_LABELS[review.workflow_state]}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {REVIEW_TYPE_LABELS[review.review_type]}
              </span>
              {review.outcome && (
                <Badge variant={OUTCOME_VARIANTS[review.outcome] ?? "default"}>
                  {OUTCOME_LABELS[review.outcome]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {review.workflow_state === "draft" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onEdit(review)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDelete(review)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    isLoading={submitMutation.isPending}
                  >
                    Submit
                  </Button>
                </>
              )}
              {review.workflow_state === "submitted" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={handleApprove}
                    isLoading={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setRejectOpen(true)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </>
              )}
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded hover:bg-muted transition-colors"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>Reviewer: <span className="font-medium text-foreground">{review.reviewer_name || review.reviewer}</span></span>
            {review.approver_name && (
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Approver: <span className="font-medium text-foreground">{review.approver_name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 text-sm bg-muted/30">
          {review.findings && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Findings</p>
              <p className="text-foreground whitespace-pre-wrap">{review.findings}</p>
            </div>
          )}
          {review.recommendations && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Recommendations</p>
              <p className="text-foreground whitespace-pre-wrap">{review.recommendations}</p>
            </div>
          )}
          {review.actions_required && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Actions Required</p>
              <p className="text-foreground whitespace-pre-wrap">{review.actions_required}</p>
            </div>
          )}
          {review.evidence && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Evidence</p>
              <p className="text-foreground whitespace-pre-wrap">{review.evidence}</p>
            </div>
          )}
          {review.next_review_date && (
            <p className="text-xs text-muted-foreground">
              Next review: <span className="font-medium text-foreground">{formatDate(review.next_review_date)}</span>
            </p>
          )}
          {review.rejection_reason && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
              <span className="font-medium">Rejection reason:</span> {review.rejection_reason}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
            {review.submitted_at && (
              <span>Submitted: {formatDate(review.submitted_at)}</span>
            )}
            {review.approved_at && (
              <span>Approved: {formatDate(review.approved_at)}</span>
            )}
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      <Modal
        open={rejectOpen}
        onClose={() => { setRejectOpen(false); setRejectReason(""); }}
        title="Reject Review"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please provide a reason for rejection so the reviewer can address the issues.
          </p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Explain why this review is being rejected…"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason(""); }}>
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
    </div>
  );
}

// ─── Reviews Panel ────────────────────────────────────────────────────────────

export function ReviewsPanel({ contentTypeId, objectId, moduleLabel = "Object" }: ReviewsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const deleteMutation = useDeleteReview();

  const { data: reviews = [], isLoading } = useReviews(contentTypeId, objectId);

  function handleEdit(r: Review) {
    setEditingReview(r);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditingReview(null);
  }

  const draftCount = reviews.filter((r) => r.workflow_state === "draft").length;
  const submittedCount = reviews.filter((r) => r.workflow_state === "submitted").length;
  const approvedCount = reviews.filter((r) => r.workflow_state === "approved").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Reviews
          {reviews.length > 0 && (
            <span className="text-muted-foreground font-normal">({reviews.length})</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {submittedCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
              {submittedCount} pending approval
            </span>
          )}
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Review
          </Button>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          {draftCount > 0 && <span>{draftCount} draft</span>}
          {submittedCount > 0 && <span className="text-blue-600">{submittedCount} submitted</span>}
          {approvedCount > 0 && <span className="text-green-600">{approvedCount} approved</span>}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No reviews yet for this {moduleLabel.toLowerCase()}.</p>
          <p className="text-xs mt-1">Reviews follow the Maker/Checker (4-eyes) principle per ISO 27001:2022.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              contentTypeId={contentTypeId}
              objectId={objectId}
              onEdit={handleEdit}
              onDelete={setDeletingReview}
            />
          ))}
        </div>
      )}

      <ReviewFormModal
        open={modalOpen}
        review={editingReview}
        contentTypeId={contentTypeId}
        objectId={objectId}
        onClose={handleModalClose}
      />

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
