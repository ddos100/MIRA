import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const EP = "/exceptions/grc-exceptions/";

export const exceptionKeys = {
  all: ["exceptions"] as const,
  lists: () => [...exceptionKeys.all, "list"] as const,
  list: (p: object) => [...exceptionKeys.lists(), p] as const,
  detail: (id: string) => [...exceptionKeys.all, id] as const,
};

export function useExceptions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: exceptionKeys.list(params ?? {}),
    queryFn: () => apiClient.get(EP, { params }).then((r) => r.data),
  });
}

export function useException(id: string) {
  return useQuery({
    queryKey: exceptionKeys.detail(id),
    queryFn: () => apiClient.get(`${EP}${id}/`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post(EP, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exceptionKeys.lists() }),
  });
}

export function useUpdateException(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`${EP}${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exceptionKeys.lists() });
      qc.invalidateQueries({ queryKey: exceptionKeys.detail(id) });
    },
  });
}

export function useDeleteException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: exceptionKeys.lists() }),
  });
}

export function useApproveException(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`${EP}${id}/approve/`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exceptionKeys.lists() });
      qc.invalidateQueries({ queryKey: exceptionKeys.detail(id) });
    },
  });
}

export function useRejectException(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      apiClient.post(`${EP}${id}/reject/`, { rejection_reason: reason }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exceptionKeys.lists() });
      qc.invalidateQueries({ queryKey: exceptionKeys.detail(id) });
    },
  });
}
