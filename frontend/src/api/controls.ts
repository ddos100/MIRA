import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const EP = "/controls/controls/";
const TEST_EP = "/controls/control-tests/";
const ISSUE_EP = "/controls/control-issues/";

export const controlKeys = {
  all: ["controls"] as const,
  lists: () => [...controlKeys.all, "list"] as const,
  list: (p: object) => [...controlKeys.lists(), p] as const,
  detail: (id: string) => [...controlKeys.all, id] as const,
  tests: (id: string) => ["control-tests", id] as const,
  issues: (id: string) => ["control-issues", id] as const,
  categories: () => ["control-categories"] as const,
};

export function useControls(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: controlKeys.list(params ?? {}),
    queryFn: () => apiClient.get(EP, { params }).then((r) => r.data),
  });
}

export function useControl(id: string) {
  return useQuery({
    queryKey: controlKeys.detail(id),
    queryFn: () => apiClient.get(`${EP}${id}/`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useControlCategories() {
  return useQuery({
    queryKey: controlKeys.categories(),
    queryFn: () =>
      apiClient.get("/controls/control-categories/?page_size=100").then((r) => r.data.results),
  });
}

export function useControlTests(controlId: string) {
  return useQuery({
    queryKey: controlKeys.tests(controlId),
    queryFn: () =>
      apiClient
        .get(TEST_EP, { params: { control: controlId, page_size: 50 } })
        .then((r) => r.data.results),
    enabled: !!controlId,
  });
}

export function useControlIssues(controlId: string) {
  return useQuery({
    queryKey: controlKeys.issues(controlId),
    queryFn: () =>
      apiClient
        .get(ISSUE_EP, { params: { control: controlId, page_size: 50 } })
        .then((r) => r.data.results),
    enabled: !!controlId,
  });
}

export function useCreateControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post(EP, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: controlKeys.lists() }),
  });
}

export function useUpdateControl(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`${EP}${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: controlKeys.lists() });
      qc.invalidateQueries({ queryKey: controlKeys.detail(id) });
    },
  });
}

export function useDeleteControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: controlKeys.lists() }),
  });
}

export function useCreateControlTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post(TEST_EP, data).then((r) => r.data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: controlKeys.tests(vars.control as string) }),
  });
}
