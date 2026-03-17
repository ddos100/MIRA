import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const PROG_EP = "/awareness/awareness-programs/";
const CONTENT_EP = "/awareness/awareness-contents/";
const ASSIGN_EP = "/awareness/awareness-assignments/";

export const awarenessKeys = {
  programs: () => ["awareness-programs"] as const,
  programList: (p: object) => [...awarenessKeys.programs(), p] as const,
  programDetail: (id: string) => [...awarenessKeys.programs(), id] as const,
  contents: (programId?: string) => ["awareness-contents", programId] as const,
  assignments: (p: object) => ["awareness-assignments", p] as const,
};

export function useAwarenessPrograms(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: awarenessKeys.programList(params ?? {}),
    queryFn: () => apiClient.get(PROG_EP, { params }).then(r => r.data),
  });
}

export function useAwarenessContents(programId: string) {
  return useQuery({
    queryKey: awarenessKeys.contents(programId),
    queryFn: () =>
      apiClient.get(CONTENT_EP, { params: { program: programId, page_size: 50 } }).then(r => r.data.results),
    enabled: !!programId,
  });
}

export function useAwarenessAssignments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: awarenessKeys.assignments(params ?? {}),
    queryFn: () => apiClient.get(ASSIGN_EP, { params }).then(r => r.data),
  });
}

export function useCreateAwarenessProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post(PROG_EP, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: awarenessKeys.programs() }),
  });
}

export function useUpdateAwarenessProgram(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`${PROG_EP}${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: awarenessKeys.programs() }),
  });
}

export function useDeleteAwarenessProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${PROG_EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: awarenessKeys.programs() }),
  });
}

export function useCreateAwarenessAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post(ASSIGN_EP, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["awareness-assignments"] }),
  });
}

export function useUpdateAwarenessAssignment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`${ASSIGN_EP}${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["awareness-assignments"] }),
  });
}
