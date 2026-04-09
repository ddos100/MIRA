import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThreatType =
  | "cyber"
  | "information_security"
  | "physical"
  | "insider"
  | "environmental"
  | "supply_chain"
  | "compliance"
  | "operational";

export type VulnerabilityType =
  | "software"
  | "hardware"
  | "network"
  | "process"
  | "human"
  | "physical"
  | "configuration"
  | "data";

export interface Threat {
  id: string;
  name: string;
  description: string;
  threat_type: ThreatType;
  asset_types: string[];
  likelihood: number;
  severity: number;
  risk_score: number;
  source: "external" | "internal" | "both";
  iso27001_clause: string;
  mitre_attack_id: string;
  is_system_default: boolean;
  linked_vulnerability_count: number;
  created_at: string;
  updated_at: string;
}

export interface Vulnerability {
  id: string;
  name: string;
  description: string;
  vulnerability_type: VulnerabilityType;
  asset_types: string[];
  severity: number;
  cvss_score: number | null;
  cve_id: string;
  remediation: string;
  iso27001_clause: string;
  is_system_default: boolean;
  linked_threat_count: number;
  created_at: string;
  updated_at: string;
}

export interface ThreatVulnerabilityLink {
  id: string;
  threat: string;
  threat_name: string;
  vulnerability: string;
  vulnerability_name: string;
  created_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

const threatKeys = {
  all: ["threats"] as const,
  lists: () => [...threatKeys.all, "list"] as const,
  list: (p?: Record<string, unknown>) => [...threatKeys.lists(), p] as const,
};

const vulnKeys = {
  all: ["vulnerabilities"] as const,
  lists: () => [...vulnKeys.all, "list"] as const,
  list: (p?: Record<string, unknown>) => [...vulnKeys.lists(), p] as const,
};

// ─── Threats ──────────────────────────────────────────────────────────────────

export function useThreats(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: threatKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get("/threats/", {
        params: { page_size: 200, ...params },
      });
      return (data?.results ?? data) as Threat[];
    },
  });
}

export function useCreateThreat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Threat>) =>
      apiClient.post<Threat>("/threats/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: threatKeys.lists() }),
  });
}

export function useUpdateThreat(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Threat>) =>
      apiClient.patch<Threat>(`/threats/${id}/`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: threatKeys.lists() }),
  });
}

export function useDeleteThreat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/threats/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: threatKeys.lists() }),
  });
}

// ─── Vulnerabilities ──────────────────────────────────────────────────────────

export function useVulnerabilities(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: vulnKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get("/threats/vulnerabilities/", {
        params: { page_size: 200, ...params },
      });
      return (data?.results ?? data) as Vulnerability[];
    },
  });
}

export function useCreateVulnerability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Vulnerability>) =>
      apiClient.post<Vulnerability>("/threats/vulnerabilities/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: vulnKeys.lists() }),
  });
}

export function useUpdateVulnerability(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Vulnerability>) =>
      apiClient.patch<Vulnerability>(`/threats/vulnerabilities/${id}/`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: vulnKeys.lists() }),
  });
}

export function useDeleteVulnerability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/threats/vulnerabilities/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: vulnKeys.lists() }),
  });
}
