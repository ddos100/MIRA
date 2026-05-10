import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssetCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export type AssetStatus = "active" | "inactive" | "retired";
export type CIARating = "low" | "medium" | "high" | "critical";

export interface Asset {
  id: string;
  name: string;
  description: string;
  category: string | null;
  category_name?: string;
  owner: string | null;
  owner_name?: string;
  business_unit: string | null;
  business_unit_name?: string;
  criticality: 1 | 2 | 3 | 4 | 5;
  confidentiality: CIARating;
  integrity: CIARating;
  availability: CIARating;
  asset_value: string | null;
  status: AssetStatus;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type DataClassification = "public" | "internal" | "confidential" | "restricted";

export interface DataAsset {
  id: string;
  asset: string;
  asset_name?: string;
  classification: DataClassification;
  retention_period_days: number | null;
  processing_purpose: string;
  legal_basis: string;
  created_at: string;
  updated_at: string;
}

export interface DataFlow {
  id: string;
  name: string;
  source_asset: string;
  source_asset_name?: string;
  destination_asset: string;
  destination_asset_name?: string;
  data_types: string;
  transfer_mechanism: string;
  is_cross_border: boolean;
  notes: string;
  // GDPR fields
  legal_basis: string;
  data_subject_categories: string;
  personal_data_categories: string;
  special_category_data: boolean;
  retention_period_days: number | null;
  transfer_safeguards: string;
  lifecycle_stage: string;
  lifecycle_stage_display?: string;
  processing_activity: string | null;
  processing_activity_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AssetParams {
  search?: string;
  category?: string;
  status?: AssetStatus | "";
  criticality?: number | "";
  owner?: string;
  business_unit?: string;
  page?: number;
  page_size?: number;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) =>
    [...assetKeys.lists(), params] as const,
  detail: (id: string) => [...assetKeys.all, "detail", id] as const,

  categories: () => [...assetKeys.all, "categories"] as const,

  dataAssets: () => [...assetKeys.all, "data-assets"] as const,
  dataAssetList: (params?: Record<string, unknown>) =>
    [...assetKeys.dataAssets(), "list", params] as const,

  dataFlows: () => [...assetKeys.all, "data-flows"] as const,
  dataFlowList: (params?: Record<string, unknown>) =>
    [...assetKeys.dataFlows(), "list", params] as const,
  dataFlowDetail: (id: string) => [...assetKeys.dataFlows(), "detail", id] as const,

  lifecycleStages: () => [...assetKeys.all, "lifecycle-stages"] as const,
  lifecycleStageList: (params?: Record<string, unknown>) =>
    [...assetKeys.lifecycleStages(), "list", params] as const,
  lifecycleStageDetail: (id: string) => [...assetKeys.lifecycleStages(), id] as const,

  lifecycleRequirements: () => [...assetKeys.all, "lifecycle-requirements"] as const,
  lifecycleRequirementList: (params?: Record<string, unknown>) =>
    [...assetKeys.lifecycleRequirements(), "list", params] as const,
};

// ─── Asset Hooks ──────────────────────────────────────────────────────────────

export function useAssets(params: AssetParams = {}) {
  return useQuery({
    queryKey: assetKeys.list(params as Record<string, unknown>),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Asset>>(
        "/assets/assets/",
        { params }
      );
      return data;
    },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Asset>(`/assets/assets/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: assetKeys.categories(),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AssetCategory>>(
        "/assets/asset-categories/",
        { params: { page_size: 100 } }
      );
      return data;
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Asset>) =>
      apiClient
        .post<Asset>("/assets/assets/", payload)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.lists() }),
  });
}

export function useUpdateAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Asset>) =>
      apiClient
        .patch<Asset>(`/assets/assets/${id}/`, payload)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
      qc.invalidateQueries({ queryKey: assetKeys.detail(id) });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/assets/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.lists() }),
  });
}

// ─── Data Asset Hooks ─────────────────────────────────────────────────────────

export function useDataAssets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: assetKeys.dataAssetList(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DataAsset>>(
        "/assets/data-assets/",
        { params: { page_size: 200, ...params } }
      );
      return data;
    },
  });
}

// ─── Data Flow Hooks ──────────────────────────────────────────────────────────

export function useDataFlows(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: assetKeys.dataFlowList(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DataFlow>>(
        "/assets/data-flows/",
        { params: { page_size: 200, ...params } }
      );
      return data;
    },
  });
}

export function useDataFlow(id: string) {
  return useQuery({
    queryKey: assetKeys.dataFlowDetail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<DataFlow>(`/assets/data-flows/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

// ─── Lifecycle Stage Types ────────────────────────────────────────────────────

export type ComplianceRating = "pending" | "met" | "partial" | "not_met" | "na";
export type ComplianceFramework = "gdpr" | "dpdpa";
export type ApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";

export interface RequirementAuditLog {
  id: string;
  action: "rated" | "submitted" | "approved" | "rejected";
  action_display: string;
  from_rating: string;
  to_rating: string;
  notes: string;
  user: string | null;
  user_name: string;
  timestamp: string;
}

export interface DataLifecycleRequirement {
  id: string;
  framework: ComplianceFramework;
  framework_display: string;
  requirement_key: string;
  requirement_label: string;
  article_reference: string;
  rating: ComplianceRating;
  rating_display: string;
  notes: string;
  privacy_risk: string | null;
  // Maker-Checker
  approval_status: ApprovalStatus;
  approval_status_display: string;
  maker: string | null;
  maker_name: string | null;
  checker: string | null;
  checker_name: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  checker_notes: string;
  is_editable: boolean;
}

export interface DataLifecycleStage {
  id: string;
  data_flow: string;
  stage: string;
  stage_display: string;
  processing_activity: string | null;
  processing_activity_name: string;
  purpose: string;
  legal_basis_gdpr: string;
  legal_basis_dpdpa: string;
  data_subject_categories: string;
  personal_data_categories: string;
  special_category_data: boolean;
  retention_period_days: number | null;
  retention_justification: string;
  security_measures: string;
  third_party_name: string;
  third_party_agreement: boolean;
  transfer_safeguards: string;
  is_cross_border: boolean;
  deletion_method: string;
  notes: string;
  compliance_status: ComplianceRating;
  compliance_status_display: string;
  compliance_notes: string;
  owner: string | null;
  owner_name: string;
  requirements: DataLifecycleRequirement[];
  created_at: string;
  updated_at: string;
}

// ─── Lifecycle Stage Hooks ────────────────────────────────────────────────────

export function useDataFlowLifecycleStages(flowId: string) {
  return useQuery({
    queryKey: assetKeys.lifecycleStageList({ data_flow: flowId }),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DataLifecycleStage>>(
        "/assets/lifecycle-stages/",
        { params: { data_flow: flowId, page_size: 10 } }
      );
      return data.results ?? [];
    },
    enabled: !!flowId,
  });
}

export function useCreateLifecycleStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DataLifecycleStage>) =>
      apiClient.post<DataLifecycleStage>("/assets/lifecycle-stages/", data).then(r => r.data),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: assetKeys.lifecycleStageList({ data_flow: vars.data_flow }) }),
  });
}

export function useUpdateLifecycleStage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DataLifecycleStage>) =>
      apiClient.patch<DataLifecycleStage>(`/assets/lifecycle-stages/${id}/`, data).then(r => r.data),
    onSuccess: (d) =>
      qc.invalidateQueries({ queryKey: assetKeys.lifecycleStageList({ data_flow: d.data_flow }) }),
  });
}

export function useDeleteLifecycleStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/lifecycle-stages/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.lifecycleStages() }),
  });
}

export function useUpdateLifecycleRequirement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DataLifecycleRequirement>) =>
      apiClient.patch<DataLifecycleRequirement>(`/assets/lifecycle-requirements/${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.lifecycleStages() }),
  });
}

export function useSubmitRequirementForApproval(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<DataLifecycleRequirement>(`/assets/lifecycle-requirements/${id}/submit/`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.lifecycleStages() }),
  });
}

export function useApproveRequirement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checkerNotes?: string) =>
      apiClient.post<DataLifecycleRequirement>(`/assets/lifecycle-requirements/${id}/approve/`, { checker_notes: checkerNotes ?? "" }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.lifecycleStages() }),
  });
}

export function useRejectRequirement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checkerNotes: string) =>
      apiClient.post<DataLifecycleRequirement>(`/assets/lifecycle-requirements/${id}/reject/`, { checker_notes: checkerNotes }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.lifecycleStages() }),
  });
}

export function useRequirementAuditLogs(id: string) {
  return useQuery({
    queryKey: ["requirementAuditLogs", id],
    queryFn: async () => {
      const { data } = await apiClient.get<RequirementAuditLog[]>(
        `/assets/lifecycle-requirements/${id}/audit-logs/`
      );
      return data;
    },
    enabled: !!id,
  });
}
