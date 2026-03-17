import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const UNIT_EP = "/organizations/business-units/";
const PROCESS_EP = "/organizations/business-processes/";

export const orgKeys = {
  units: () => ["business-units"] as const,
  unitList: (p: object) => [...orgKeys.units(), p] as const,
  processes: () => ["business-processes"] as const,
  processList: (p: object) => [...orgKeys.processes(), p] as const,
};

export function useBusinessUnits(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: orgKeys.unitList(params ?? {}),
    queryFn: () => apiClient.get(UNIT_EP, { params }).then(r => r.data),
  });
}

export function useBusinessProcesses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: orgKeys.processList(params ?? {}),
    queryFn: () => apiClient.get(PROCESS_EP, { params }).then(r => r.data),
  });
}

export function useCreateBusinessUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post(UNIT_EP, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.units() }),
  });
}

export function useUpdateBusinessUnit(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`${UNIT_EP}${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.units() }),
  });
}

export function useDeleteBusinessUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${UNIT_EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.units() }),
  });
}

export function useCreateBusinessProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post(PROCESS_EP, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.processes() }),
  });
}

export function useUpdateBusinessProcess(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`${PROCESS_EP}${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.processes() }),
  });
}

export function useDeleteBusinessProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${PROCESS_EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.processes() }),
  });
}
