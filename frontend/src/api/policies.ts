import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Policy, PolicyVersion } from "@/types";

const EP = "/policies/policies/";
const ACK_EP = "/policies/policy-acknowledgements/";

export const policyKeys = {
  all: ["policies"] as const,
  lists: () => [...policyKeys.all, "list"] as const,
  list: (p: object) => [...policyKeys.lists(), p] as const,
  detail: (id: string) => [...policyKeys.all, id] as const,
  acks: (id: string) => ["policy-acks", id] as const,
  categories: () => ["policy-categories"] as const,
};

export function usePolicies(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: policyKeys.list(params ?? {}),
    queryFn: () => apiClient.get(EP, { params }).then((r) => r.data),
  });
}

export function usePolicy(id: string) {
  return useQuery({
    queryKey: policyKeys.detail(id),
    queryFn: () => apiClient.get(`${EP}${id}/`).then((r) => r.data as Policy),
    enabled: !!id,
  });
}

export function usePolicyCategories() {
  return useQuery({
    queryKey: policyKeys.categories(),
    queryFn: () =>
      apiClient.get("/policies/policy-categories/?page_size=100").then((r) => r.data.results),
  });
}

export function usePolicyAcknowledgements(policyId: string) {
  return useQuery({
    queryKey: policyKeys.acks(policyId),
    queryFn: () =>
      apiClient
        .get(ACK_EP, { params: { policy: policyId, page_size: 200 } })
        .then((r) => r.data.results),
    enabled: !!policyId,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Policy>) => apiClient.post(EP, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.lists() }),
  });
}

export function useUpdatePolicy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Policy>) =>
      apiClient.patch(`${EP}${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.lists() });
      qc.invalidateQueries({ queryKey: policyKeys.detail(id) });
    },
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.lists() }),
  });
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyId: string) =>
      apiClient.post(ACK_EP, { policy: policyId }).then((r) => r.data),
    onSuccess: (_, policyId) =>
      qc.invalidateQueries({ queryKey: policyKeys.acks(policyId) }),
  });
}

export function usePolicyVersions(policyId: string) {
  return useQuery({
    queryKey: ["policy-versions", policyId],
    queryFn: () =>
      apiClient
        .get<{ results: PolicyVersion[] }>("/policies/versions/", {
          params: { policy: policyId, page_size: 50, ordering: "-approved_at" },
        })
        .then((r) => r.data.results),
    enabled: !!policyId,
  });
}
