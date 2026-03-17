import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const PROJECT_EP = "/projects/projects/";
const TASK_EP = "/projects/project-tasks/";

export const projectKeys = {
  projects: () => ["projects"] as const,
  projectList: (p: object) => [...projectKeys.projects(), p] as const,
  projectDetail: (id: string) => [...projectKeys.projects(), id] as const,
  tasks: (projectId?: string) => ["project-tasks", projectId] as const,
};

export function useProjects(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: projectKeys.projectList(params ?? {}),
    queryFn: () => apiClient.get(PROJECT_EP, { params }).then(r => r.data),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.projectDetail(id),
    queryFn: () => apiClient.get(`${PROJECT_EP}${id}/`).then(r => r.data),
    enabled: !!id,
  });
}

export function useProjectTasks(projectId?: string) {
  return useQuery({
    queryKey: projectKeys.tasks(projectId),
    queryFn: () =>
      apiClient.get(TASK_EP, { params: { project: projectId, page_size: 100 } }).then(r => r.data.results),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post(PROJECT_EP, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.projects() }),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`${PROJECT_EP}${id}/`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.projects() });
      qc.invalidateQueries({ queryKey: projectKeys.projectDetail(id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${PROJECT_EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.projects() }),
  });
}

export function useCreateProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post(TASK_EP, data).then(r => r.data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: projectKeys.tasks(vars.project as string) }),
  });
}

export function useUpdateProjectTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`${TASK_EP}${id}/`, data).then(r => r.data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: projectKeys.tasks(data.project) }),
  });
}

export function useDeleteProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      apiClient.delete(`${TASK_EP}${id}/`).then(() => projectId),
    onSuccess: (projectId) =>
      qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) }),
  });
}
