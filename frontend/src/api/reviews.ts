import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  content_type: number;
  content_type_label: string;
  object_id: string;
  object_repr: string;
  sequence_number: number;
  review_type: "periodic" | "triggered" | "ad_hoc" | "audit" | "management";
  review_date: string;
  reviewer: string;
  reviewer_name: string;
  approver: string | null;
  approver_name: string | null;
  workflow_state: "draft" | "submitted" | "approved" | "rejected";
  /** Server-computed: "current" | "upcoming" | "previous" */
  period_status: "current" | "upcoming" | "previous";
  outcome: "satisfactory" | "needs_improvement" | "unsatisfactory" | "critical" | "";
  findings: string;
  recommendations: string;
  actions_required: string;
  evidence: string;
  next_review_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const reviewKeys = {
  all: ["reviews"] as const,
  forObject: (contentTypeId: number | undefined, objectId: string | undefined) =>
    ["reviews", "object", contentTypeId, objectId] as const,
  forModule: (contentTypeId: number | undefined) =>
    ["reviews", "module", contentTypeId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Reviews for a single object (used in detail panels). */
export function useReviews(contentTypeId?: number, objectId?: string) {
  return useQuery({
    queryKey: reviewKeys.forObject(contentTypeId, objectId),
    queryFn: async () => {
      const { data } = await apiClient.get("/core/reviews/", {
        params: {
          content_type: contentTypeId,
          object_id: objectId,
          page_size: 200,
          ordering: "-review_date",
        },
      });
      return (data?.results ?? data) as Review[];
    },
    enabled: !!contentTypeId && !!objectId,
  });
}

/** Reviews for all objects of a module (used in the module-level Reviews tab). */
export function useModuleReviews(contentTypeId?: number) {
  return useQuery({
    queryKey: reviewKeys.forModule(contentTypeId),
    queryFn: async () => {
      const { data } = await apiClient.get("/core/reviews/", {
        params: {
          content_type: contentTypeId,
          page_size: 500,
          ordering: "-review_date",
        },
      });
      return (data?.results ?? data) as Review[];
    },
    enabled: !!contentTypeId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Review>) =>
      apiClient.post<Review>("/core/reviews/", payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: reviewKeys.forObject(data.content_type, data.object_id) });
      qc.invalidateQueries({ queryKey: reviewKeys.forModule(data.content_type) });
    },
  });
}

export function useUpdateReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Review>) =>
      apiClient.patch<Review>(`/core/reviews/${id}/`, payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: reviewKeys.forObject(data.content_type, data.object_id) });
      qc.invalidateQueries({ queryKey: reviewKeys.forModule(data.content_type) });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (review: Review) =>
      apiClient.delete(`/core/reviews/${review.id}/`).then(() => review),
    onSuccess: (review) => {
      qc.invalidateQueries({ queryKey: reviewKeys.forObject(review.content_type, review.object_id) });
      qc.invalidateQueries({ queryKey: reviewKeys.forModule(review.content_type) });
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Review>(`/core/reviews/${id}/submit/`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: reviewKeys.forObject(data.content_type, data.object_id) });
      qc.invalidateQueries({ queryKey: reviewKeys.forModule(data.content_type) });
    },
  });
}

/**
 * Approve (close) a review. Requires next_review_date — auto-creates next review cycle.
 */
export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, next_review_date }: { id: string; next_review_date: string }) =>
      apiClient
        .post<Review>(`/core/reviews/${id}/approve/`, { next_review_date })
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: reviewKeys.forObject(data.content_type, data.object_id) });
      qc.invalidateQueries({ queryKey: reviewKeys.forModule(data.content_type) });
    },
  });
}

export function useRejectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<Review>(`/core/reviews/${id}/reject/`, { reason }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: reviewKeys.forObject(data.content_type, data.object_id) });
      qc.invalidateQueries({ queryKey: reviewKeys.forModule(data.content_type) });
    },
  });
}
