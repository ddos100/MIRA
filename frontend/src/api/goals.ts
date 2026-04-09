import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoalCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface GoalAuditSchedule {
  id: string;
  frequency: "monthly" | "quarterly" | "biannual" | "annual" | "ad_hoc";
  assigned_auditor: string | null;
  next_audit_date: string | null;
  last_audit_date: string | null;
  audit_criteria: string;
  is_active: boolean;
}

export interface GoalReview {
  id: string;
  goal: string;
  goal_title: string;
  review_date: string;
  reviewer: string;
  reviewer_name: string;
  approver: string | null;
  approver_name: string | null;
  workflow_state: "draft" | "submitted" | "approved" | "rejected";
  outcome: "on_track" | "at_risk" | "behind" | "completed" | "cancelled";
  current_value: number | null;
  findings: string;
  recommendations: string;
  actions_required: string;
  next_review_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  objective: string;
  measurable_target: string;
  unit: string;
  baseline_value: number | null;
  target_value: number | null;
  current_value: number | null;
  progress_pct: number | null;
  category: string | null;
  category_name: string | null;
  owner: string | null;
  owner_name: string | null;
  business_unit: string | null;
  business_unit_name: string | null;
  start_date: string | null;
  target_date: string | null;
  status: "draft" | "active" | "on_track" | "at_risk" | "behind" | "completed" | "cancelled";
  iso27001_clause: string;
  review_frequency: "monthly" | "quarterly" | "biannual" | "annual" | "ad_hoc";
  next_review_date: string | null;
  last_review_date: string | null;
  notes: string;
  review_count: number;
  latest_review: { id: string; review_date: string; outcome: string; workflow_state: string } | null;
  audit_schedule: GoalAuditSchedule | null;
  created_at: string;
  updated_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const goalKeys = {
  all: ["goals"] as const,
  lists: () => [...goalKeys.all, "list"] as const,
  list: (p?: Record<string, unknown>) => [...goalKeys.lists(), p] as const,
  detail: (id: string) => [...goalKeys.all, "detail", id] as const,
  reviews: (goalId?: string) => [...goalKeys.all, "reviews", goalId] as const,
  categories: () => [...goalKeys.all, "categories"] as const,
};

// ─── Goals ────────────────────────────────────────────────────────────────────

export function useGoals(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: goalKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get("/goals/", { params: { page_size: 100, ...params } });
      return (data?.results ?? data) as Goal[];
    },
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Goal>(`/goals/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Goal>) =>
      apiClient.post<Goal>("/goals/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.lists() }),
  });
}

export function useUpdateGoal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Goal>) =>
      apiClient.patch<Goal>(`/goals/${id}/`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/goals/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.lists() }),
  });
}

// ─── Goal Reviews ─────────────────────────────────────────────────────────────

export function useGoalReviews(goalId?: string) {
  return useQuery({
    queryKey: goalKeys.reviews(goalId),
    queryFn: async () => {
      const { data } = await apiClient.get("/goals/reviews/", {
        params: { goal: goalId, page_size: 100 },
      });
      return (data?.results ?? data) as GoalReview[];
    },
    enabled: !!goalId,
  });
}

export function useCreateGoalReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<GoalReview>) =>
      apiClient.post<GoalReview>("/goals/reviews/", payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: goalKeys.reviews(data.goal) });
      qc.invalidateQueries({ queryKey: goalKeys.detail(data.goal) });
    },
  });
}

export function useUpdateGoalReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<GoalReview>) =>
      apiClient.patch<GoalReview>(`/goals/reviews/${id}/`, payload).then((r) => r.data),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: goalKeys.reviews(data.goal) }),
  });
}

export function useSubmitGoalReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<GoalReview>(`/goals/reviews/${id}/submit/`).then((r) => r.data),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: goalKeys.reviews(data.goal) }),
  });
}

export function useApproveGoalReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<GoalReview>(`/goals/reviews/${id}/approve/`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: goalKeys.reviews(data.goal) });
      qc.invalidateQueries({ queryKey: goalKeys.detail(data.goal) });
    },
  });
}

export function useRejectGoalReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<GoalReview>(`/goals/reviews/${id}/reject/`, { reason }).then((r) => r.data),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: goalKeys.reviews(data.goal) }),
  });
}

// ─── Goal Categories ──────────────────────────────────────────────────────────

export function useGoalCategories() {
  return useQuery({
    queryKey: goalKeys.categories(),
    queryFn: async () => {
      const { data } = await apiClient.get("/goals/categories/");
      return (data?.results ?? data) as GoalCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
