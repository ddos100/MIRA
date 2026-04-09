import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  content_type: number;
  content_type_label: string;
  object_id: string;
  review_type: "periodic" | "triggered" | "ad_hoc" | "audit" | "management";
  review_date: string;
  reviewer: string;
  reviewer_name: string;
  approver: string | null;
  approver_name: string | null;
  workflow_state: "draft" | "submitted" | "approved" | "rejected";
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
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useReviews(contentTypeId?: number, objectId?: string) {
  return useQuery({
    queryKey: reviewKeys.forObject(contentTypeId, objectId),
    queryFn: async () => {
      const { data } = await apiClient.get("/core/reviews/", {
        params: {
          content_type: contentTypeId,
          object_id: objectId,
          page_size: 100,
          ordering: "-review_date",
        },
      });
      return (data?.results ?? data) as Review[];
    },
    enabled: !!contentTypeId && !!objectId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Review>) =>
      apiClient.post<Review>("/core/reviews/", payload).then((r) => r.data),
    onSuccess: (data) =>
      qc.invalidateQueries({
        queryKey: reviewKeys.forObject(data.content_type, data.object_id),
      }),
  });
}

export function useUpdateReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Review>) =>
      apiClient.patch<Review>(`/core/reviews/${id}/`, payload).then((r) => r.data),
    onSuccess: (data) =>
      qc.invalidateQueries({
        queryKey: reviewKeys.forObject(data.content_type, data.object_id),
      }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (review: Review) =>
      apiClient.delete(`/core/reviews/${review.id}/`).then(() => review),
    onSuccess: (review) =>
      qc.invalidateQueries({
        queryKey: reviewKeys.forObject(review.content_type, review.object_id),
      }),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Review>(`/core/reviews/${id}/submit/`).then((r) => r.data),
    onSuccess: (data) =>
      qc.invalidateQueries({
        queryKey: reviewKeys.forObject(data.content_type, data.object_id),
      }),
  });
}

export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Review>(`/core/reviews/${id}/approve/`).then((r) => r.data),
    onSuccess: (data) =>
      qc.invalidateQueries({
        queryKey: reviewKeys.forObject(data.content_type, data.object_id),
      }),
  });
}

export function useRejectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<Review>(`/core/reviews/${id}/reject/`, { reason }).then((r) => r.data),
    onSuccess: (data) =>
      qc.invalidateQueries({
        queryKey: reviewKeys.forObject(data.content_type, data.object_id),
      }),
  });
}
