import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { PaginatedResponse } from "@/types";

// Generic paginated list
export function useList<T>(
  queryKey: string[],
  endpoint: string,
  params?: Record<string, unknown>
) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<T>>(endpoint, { params })
        .then((r) => r.data),
  });
}

// Generic detail
export function useDetail<T>(
  queryKey: string[],
  endpoint: string,
  id?: string
) {
  return useQuery({
    queryKey: [...queryKey, id],
    queryFn: () =>
      apiClient.get<T>(`${endpoint}${id}/`).then((r) => r.data),
    enabled: !!id,
  });
}

// Generic create
export function useCreate<T>(queryKey: string[], endpoint: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<T>) =>
      apiClient.post<T>(endpoint, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

// Generic update (PATCH)
export function useUpdate<T>(queryKey: string[], endpoint: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
      apiClient.patch<T>(`${endpoint}${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

// Generic delete
export function useDelete(queryKey: string[], endpoint: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${endpoint}${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}
