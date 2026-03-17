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
