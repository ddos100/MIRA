import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const PLAN_EP = "/continuity/continuity-plans/";
const BIA_EP = "/continuity/bias/";
const TEST_EP = "/continuity/continuity-tests/";

export const continuityKeys = {
  plans: () => ["continuity-plans"] as const,
  planList: (p: object) => [...continuityKeys.plans(), p] as const,
  planDetail: (id: string) => [...continuityKeys.plans(), id] as const,
  bias: () => ["bia"] as const,
  tests: (planId?: string) => ["continuity-tests", planId] as const,
};

export function useContinuityPlans(params?: Record<string, unknown>) {
  return useQuery({ queryKey: continuityKeys.planList(params ?? {}), queryFn: () => apiClient.get(PLAN_EP, { params }).then(r => r.data) });
}
export function useContinuityPlan(id: string) {
  return useQuery({ queryKey: continuityKeys.planDetail(id), queryFn: () => apiClient.get(`${PLAN_EP}${id}/`).then(r => r.data), enabled: !!id });
}
export function useBIAs(params?: Record<string, unknown>) {
  return useQuery({ queryKey: continuityKeys.bias(), queryFn: () => apiClient.get(BIA_EP, { params }).then(r => r.data) });
}
export function useContinuityTests(planId?: string) {
  return useQuery({ queryKey: continuityKeys.tests(planId), queryFn: () => apiClient.get(TEST_EP, { params: planId ? { plan: planId } : {} }).then(r => r.data.results) });
}
export function useCreateContinuityPlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post(PLAN_EP, d).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: continuityKeys.plans() }) });
}
export function useUpdateContinuityPlan(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.patch(`${PLAN_EP}${id}/`, d).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: continuityKeys.plans() }) });
}
export function useCreateContinuityTest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post(TEST_EP, d).then(r => r.data), onSuccess: (_, v) => qc.invalidateQueries({ queryKey: continuityKeys.tests(v.plan as string) }) });
}
