import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IncidentSeverity = "p1" | "p2" | "p3" | "p4";
export type IncidentStatus =
  | "new"
  | "triaged"
  | "investigating"
  | "contained"
  | "resolved"
  | "closed";

export interface IncidentCategory {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: string | null;
  category_detail?: { id: string; name: string };
  severity: IncidentSeverity;
  status: IncidentStatus;
  owner: string | null;
  owner_detail?: { id: string; full_name: string; email: string };
  reporter: string | null;
  reporter_detail?: { id: string; full_name: string; email: string };
  detected_at: string | null;
  reported_at: string | null;
  contained_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  is_data_breach: boolean;
  gdpr_notification_required: boolean;
  gdpr_notification_sent_at: string | null;
  assets_affected: string[];
  risks_raised: string[];
  lessons_learned: string;
  root_cause: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentUpdate {
  id: string;
  incident: string;
  body: string;
  created_by?: string | null;
  created_by_detail?: { id: string; full_name: string; email: string };
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface IncidentParams {
  search?: string;
  severity?: IncidentSeverity | "";
  status?: IncidentStatus | "";
  category?: string;
  is_data_breach?: boolean | "";
  page?: number;
  page_size?: number;
}

// ─── Incident Category Hooks ──────────────────────────────────────────────────

export function useIncidentCategories() {
  return useQuery({
    queryKey: ["incidentCategories"],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<IncidentCategory>>(
        "/incidents/incident-categories/",
        { params: { page_size: 100 } }
      );
      return data;
    },
  });
}

// ─── Incident Hooks ───────────────────────────────────────────────────────────

export function useIncidents(params: IncidentParams = {}) {
  return useQuery({
    queryKey: ["incidents", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Incident>>(
        "/incidents/incidents/",
        { params }
      );
      return data;
    },
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: async () => {
      const { data } = await apiClient.get<Incident>(
        `/incidents/incidents/${id}/`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useIncidentUpdates(incidentId: string) {
  return useQuery({
    queryKey: ["incidentUpdates", incidentId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<IncidentUpdate>>(
        "/incidents/incident-updates/",
        { params: { incident: incidentId, page_size: 100 } }
      );
      return data;
    },
    enabled: !!incidentId,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Incident>) =>
      apiClient.post<Incident>("/incidents/incidents/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }),
  });
}

export function useUpdateIncident(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Incident>) =>
      apiClient.patch<Incident>(`/incidents/incidents/${id}/`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["incident", id] });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/incidents/incidents/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }),
  });
}

export function useCreateIncidentUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<IncidentUpdate>) =>
      apiClient.post<IncidentUpdate>("/incidents/incident-updates/", payload).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["incidentUpdates", variables.incident] });
    },
  });
}

export function useCloseIncident(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<Incident>(`/incidents/incidents/${id}/close/`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["incident", id] });
    },
  });
}

export function useResolveIncident(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<Incident>(`/incidents/incidents/${id}/resolve/`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["incident", id] });
    },
  });
}
