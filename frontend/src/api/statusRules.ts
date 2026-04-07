/**
 * Status Rules (Dynamic Status Engine) API hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { StatusRule } from "./compliance";

const keys = {
  all: ["status-rules"] as const,
  list: (p?: Record<string, unknown>) => ["status-rules", "list", p] as const,
  detail: (id: string) => ["status-rules", "detail", id] as const,
};

export function useStatusRules(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get("/core/status-rules/", {
        params: { page_size: 100, ...params },
      });
      return (data?.results ?? data) as StatusRule[];
    },
  });
}

export function useCreateStatusRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<StatusRule>) => {
      const { data } = await apiClient.post<StatusRule>(
        "/core/status-rules/",
        payload
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateStatusRule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<StatusRule>) => {
      const { data } = await apiClient.patch<StatusRule>(
        `/core/status-rules/${id}/`,
        payload
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteStatusRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/core/status-rules/${id}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRunStatusRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/core/status-rules/${id}/run/`);
      return data as { affected: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRunAllStatusRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/core/status-rules/run-all/");
      return data as Record<string, number>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
