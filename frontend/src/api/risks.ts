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
