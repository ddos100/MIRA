import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const UNIT_EP = "/organizations/business-units/";
const PROCESS_EP = "/organizations/business-processes/";
const SCOPE_EP = "/organizations/scope/";
const ISSUES_EP = "/organizations/issues/";
const RISK_OPP_EP = "/organizations/risk-opportunities/";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScopeApprovalRecord {
  id: string;
  version: string;
  approved_by: string | null;
  approved_by_name: string;
  approved_at: string;
  next_review_date: string | null;
  notes: string;
}

export interface Scope {
  id: string;
  title: string;
  content: string;
  version: string;
  status: "draft" | "approved" | "superseded";
  status_display: string;
  workflow_state: "draft" | "submitted" | "approved" | "rejected";
  workflow_state_display: string;
  effective_date: string | null;
  review_periodicity_days: number;
  review_periodicity_display: string;
  next_review_date: string | null;
  reviewer: string | null;
  reviewer_name: string;
  approver: string | null;
  approver_name: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string;
  approval_history: ScopeApprovalRecord[];
  created_at: string;
  updated_at: string;
}

export interface OrganizationalIssue {
  id: string;
  title: string;
  description: string;
  issue_type: "internal" | "external";
  issue_type_display: string;
  category: "risk" | "opportunity" | "constraint" | "trend";
  category_display: string;
  impact_level: "low" | "medium" | "high" | "critical";
  impact_level_display: string;
  status: "open" | "in_progress" | "resolved" | "accepted";
  status_display: string;
  owner: string | null;
  owner_name: string;
  due_date: string | null;
  resolution_notes: string;
  linked_risks: string[];
  linked_risk_names: string[];
  created_at: string;
  updated_at: string;
}

export interface RiskOpportunity {
  id: string;
  title: string;
  description: string;
  item_type: "risk" | "opportunity";
  item_type_display: string;
  linked_issue: string | null;
  linked_issue_title: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  likelihood_display: string;
  impact: 1 | 2 | 3 | 4 | 5;
  impact_display: string;
  risk_score: number;
  treatment: "accept" | "mitigate" | "transfer" | "avoid" | "exploit" | "share" | "enhance";
  treatment_display: string;
  treatment_plan: string;
  residual_level: "low" | "medium" | "high" | "critical" | "";
  residual_level_display: string;
  status: "open" | "in_treatment" | "monitored" | "closed";
  status_display: string;
  owner: string | null;
  owner_name: string;
  due_date: string | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const orgKeys = {
  units: () => ["business-units"] as const,
  unitList: (p: object) => [...orgKeys.units(), p] as const,
  processes: () => ["business-processes"] as const,
  processList: (p: object) => [...orgKeys.processes(), p] as const,
};

export const scopeKeys = {
  all: ["scope"] as const,
  list: (p?: object) => [...scopeKeys.all, p ?? {}] as const,
};

export const issueKeys = {
  all: ["org-issues"] as const,
  list: (p?: object) => [...issueKeys.all, p ?? {}] as const,
};

export const riskOppKeys = {
  all: ["risk-opportunities"] as const,
  list: (p?: object) => [...riskOppKeys.all, p ?? {}] as const,
};

// ─── Business Units ───────────────────────────────────────────────────────────

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
    mutationFn: (data: Record<string, unknown>) => apiClient.patch(`${UNIT_EP}${id}/`, data).then(r => r.data),
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
    mutationFn: (data: Record<string, unknown>) => apiClient.patch(`${PROCESS_EP}${id}/`, data).then(r => r.data),
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

// ─── Scope ────────────────────────────────────────────────────────────────────

export function useScopes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: scopeKeys.list(params),
    queryFn: () =>
      apiClient.get<{ results: Scope[] }>(SCOPE_EP, { params: { page_size: 50, ...params } })
        .then(r => r.data.results ?? []),
  });
}

export function useCreateScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Scope>) => apiClient.post<Scope>(SCOPE_EP, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scopeKeys.all }),
  });
}

export function useUpdateScope(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Scope>) => apiClient.patch<Scope>(`${SCOPE_EP}${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scopeKeys.all }),
  });
}

export function useDeleteScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${SCOPE_EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: scopeKeys.all }),
  });
}

export function useScopeAction(id: string, action: "submit" | "approve" | "reject") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { reason?: string }) =>
      apiClient.post<Scope>(`${SCOPE_EP}${id}/${action}/`, payload ?? {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scopeKeys.all }),
  });
}

// ─── Organizational Issues ────────────────────────────────────────────────────

export function useOrgIssues(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: issueKeys.list(params),
    queryFn: () =>
      apiClient.get<{ results: OrganizationalIssue[] }>(ISSUES_EP, { params: { page_size: 200, ...params } })
        .then(r => r.data.results ?? []),
  });
}

export function useCreateOrgIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OrganizationalIssue>) =>
      apiClient.post<OrganizationalIssue>(ISSUES_EP, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: issueKeys.all }),
  });
}

export function useUpdateOrgIssue(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OrganizationalIssue>) =>
      apiClient.patch<OrganizationalIssue>(`${ISSUES_EP}${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: issueKeys.all }),
  });
}

export function useDeleteOrgIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${ISSUES_EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: issueKeys.all }),
  });
}

// ─── Risks & Opportunities ────────────────────────────────────────────────────

export function useRiskOpportunities(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: riskOppKeys.list(params),
    queryFn: () =>
      apiClient.get<{ results: RiskOpportunity[] }>(RISK_OPP_EP, { params: { page_size: 200, ...params } })
        .then(r => r.data.results ?? []),
  });
}

export function useCreateRiskOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RiskOpportunity>) =>
      apiClient.post<RiskOpportunity>(RISK_OPP_EP, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskOppKeys.all }),
  });
}

export function useUpdateRiskOpportunity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RiskOpportunity>) =>
      apiClient.patch<RiskOpportunity>(`${RISK_OPP_EP}${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskOppKeys.all }),
  });
}

export function useDeleteRiskOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${RISK_OPP_EP}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskOppKeys.all }),
  });
}
