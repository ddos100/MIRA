import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Risk, RiskCategory, RiskTreatmentPlan } from "@/types";

const ENDPOINT = "/risks/";
const CAT_ENDPOINT = "/risks/categories/";

// Query keys
export const riskKeys = {
  all: ["risks"] as const,
  lists: () => [...riskKeys.all, "list"] as const,
  list: (params: object) => [...riskKeys.lists(), params] as const,
  detail: (id: string) => [...riskKeys.all, id] as const,
  heatmap: () => [...riskKeys.all, "heatmap"] as const,
  categories: () => ["risk-categories"] as const,
  treatments: (riskId: string) => ["risk-treatments", riskId] as const,
};

export function useRisks(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: riskKeys.list(params ?? {}),
    queryFn: () => apiClient.get(ENDPOINT, { params }).then(r => r.data),
  });
}

export function useRisk(id: string) {
  return useQuery({
    queryKey: riskKeys.detail(id),
    queryFn: () => apiClient.get(`${ENDPOINT}${id}/`).then(r => r.data as Risk),
    enabled: !!id,
  });
}

export function useRiskHeatmap() {
  return useQuery({
    queryKey: riskKeys.heatmap(),
    queryFn: () =>
      apiClient
        .get("/risks/heatmap/")
        .then(r => r.data as Array<{ likelihood: number; impact: number; count: number }>),
  });
}

export function useRiskCategories() {
  return useQuery({
    queryKey: riskKeys.categories(),
    queryFn: () =>
      apiClient
        .get(`${CAT_ENDPOINT}?page_size=100`)
        .then(r => r.data.results as RiskCategory[]),
  });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Risk>) =>
      apiClient.post(ENDPOINT, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.lists() }),
  });
}

export function useUpdateRisk(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Risk>) =>
      apiClient.patch(`${ENDPOINT}${id}/`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: riskKeys.lists() });
      qc.invalidateQueries({ queryKey: riskKeys.detail(id) });
    },
  });
}

export function useDeleteRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${ENDPOINT}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.lists() }),
  });
}

export function useTreatmentPlans(riskId: string) {
  return useQuery({
    queryKey: riskKeys.treatments(riskId),
    queryFn: () =>
      apiClient
        .get("/risks/treatment-plans/", { params: { risk: riskId, page_size: 100 } })
        .then(r => r.data.results as RiskTreatmentPlan[]),
    enabled: !!riskId,
  });
}

export function useCreateTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RiskTreatmentPlan>) =>
      apiClient.post("/risks/treatment-plans/", data).then(r => r.data),
    onSuccess: (_result, vars) =>
      qc.invalidateQueries({ queryKey: riskKeys.treatments(vars.risk as string) }),
  });
}

export function useAllTreatmentPlans(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["all-treatment-plans", params ?? {}],
    queryFn: () =>
      apiClient
        .get("/risks/treatment-plans/", { params: { page_size: 100, ...params } })
        .then(r => r.data),
  });
}

// ─── Risk Appetite ───────────────────────────────────────────────────────────

export type AppetiteApprovalStatus = "draft" | "approved" | "revoked";

export interface RiskAppetite {
  id: string;
  name: string;
  statement: string;
  category: string | null;
  category_name?: string | null;
  business_unit: string | null;
  business_unit_name?: string | null;
  threshold_green: number;
  threshold_amber: number;
  threshold_red: number;
  max_acceptable_rating: "low" | "medium" | "high" | "critical";
  owner: string | null;
  owner_name?: string | null;
  approval_status: AppetiteApprovalStatus;
  approved_by: string | null;
  approved_by_name?: string | null;
  approved_at: string | null;
  effective_date: string | null;
  review_date: string | null;
  created_at: string;
  updated_at: string;
}

export const appetiteKeys = {
  all: ["risk-appetites"] as const,
  list: (params: object) => [...appetiteKeys.all, "list", params] as const,
  detail: (id: string) => [...appetiteKeys.all, id] as const,
};

export function useRiskAppetites(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: appetiteKeys.list(params ?? {}),
    queryFn: () =>
      apiClient
        .get("/risks/appetites/", { params: { page_size: 100, ...params } })
        .then(r => r.data),
  });
}

export function useCreateRiskAppetite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RiskAppetite>) =>
      apiClient.post("/risks/appetites/", data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: appetiteKeys.all }),
  });
}

export function useUpdateRiskAppetite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RiskAppetite>) =>
      apiClient.patch(`/risks/appetites/${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: appetiteKeys.all }),
  });
}

export function useDeleteRiskAppetite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/risks/appetites/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: appetiteKeys.all }),
  });
}

// ─── Key Risk Indicators (KRI) ────────────────────────────────────────────────

export type KRIStatus = "green" | "amber" | "red" | "unknown";
export type KRIDirection = "higher_worse" | "lower_worse";
export type KRIFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annually";

export interface KeyRiskIndicator {
  id: string;
  name: string;
  description: string;
  metric_unit: string;
  direction: KRIDirection;
  threshold_green: number;
  threshold_amber: number;
  threshold_red: number;
  current_value: number | null;
  last_measured_at: string | null;
  measurement_frequency: KRIFrequency;
  owner: string | null;
  owner_name?: string | null;
  business_unit: string | null;
  business_unit_name?: string | null;
  related_risks: string[];
  related_risk_titles?: string[];
  is_active: boolean;
  status: KRIStatus;
  measurement_count?: number;
  created_at: string;
  updated_at: string;
}

export interface KRIMeasurement {
  id: string;
  kri: string;
  value: number;
  measured_at: string;
  note: string;
  created_at: string;
}

export const kriKeys = {
  all: ["kris"] as const,
  list: (params: object) => [...kriKeys.all, "list", params] as const,
  detail: (id: string) => [...kriKeys.all, id] as const,
  measurements: (id: string) => [...kriKeys.all, id, "measurements"] as const,
};

export function useKRIs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: kriKeys.list(params ?? {}),
    queryFn: () =>
      apiClient
        .get("/risks/kris/", { params: { page_size: 100, ...params } })
        .then(r => r.data),
  });
}

export function useKRI(id: string) {
  return useQuery({
    queryKey: kriKeys.detail(id),
    queryFn: () => apiClient.get(`/risks/kris/${id}/`).then(r => r.data as KeyRiskIndicator),
    enabled: !!id,
  });
}

export function useKRIMeasurements(id: string) {
  return useQuery({
    queryKey: kriKeys.measurements(id),
    queryFn: () =>
      apiClient
        .get(`/risks/kris/${id}/measurements/`)
        .then(r => r.data as KRIMeasurement[]),
    enabled: !!id,
  });
}

export function useCreateKRI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<KeyRiskIndicator>) =>
      apiClient.post("/risks/kris/", data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: kriKeys.all }),
  });
}

export function useUpdateKRI(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<KeyRiskIndicator>) =>
      apiClient.patch(`/risks/kris/${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: kriKeys.all }),
  });
}

export function useDeleteKRI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/risks/kris/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: kriKeys.all }),
  });
}

export function useRecordKRI(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { value: number; note?: string }) =>
      apiClient.post(`/risks/kris/${id}/record/`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kriKeys.all });
      qc.invalidateQueries({ queryKey: kriKeys.measurements(id) });
    },
  });
}
