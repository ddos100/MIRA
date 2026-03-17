import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskTier = "tier1" | "tier2" | "tier3" | "tier4";
export type VendorType =
  | "supplier"
  | "partner"
  | "contractor"
  | "cloud_provider"
  | "subprocessor"
  | "other";

export interface Vendor {
  id: string;
  name: string;
  vendor_type: VendorType;
  risk_tier: RiskTier;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  owner: string | null;
  owner_detail?: { id: string; full_name: string; email: string };
  contract_start: string | null;
  contract_end: string | null;
  is_active: boolean;
  description: string;
  services_provided: string;
  data_shared: boolean;
  processing_personal_data: boolean;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = "pending" | "in_progress" | "completed" | "overdue";

export interface VendorReview {
  id: string;
  third_party: string;
  reviewer: string | null;
  reviewer_detail?: { id: string; full_name: string; email: string };
  review_date: string;
  status: ReviewStatus;
  risk_rating: RiskTier | null;
  findings: string;
  recommendations: string;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface VendorParams {
  search?: string;
  vendor_type?: VendorType | "";
  risk_tier?: RiskTier | "";
  is_active?: boolean | "";
  page?: number;
  page_size?: number;
}

// ─── Vendor Hooks ─────────────────────────────────────────────────────────────

export function useVendors(params: VendorParams = {}) {
  return useQuery({
    queryKey: ["vendors", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Vendor>>(
        "/third-parties/third-parties/",
        { params }
      );
      return data;
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const { data } = await apiClient.get<Vendor>(
        `/third-parties/third-parties/${id}/`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useVendorReviews(vendorId: string) {
  return useQuery({
    queryKey: ["vendorReviews", vendorId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<VendorReview>>(
        `/third-parties/third-party-reviews/`,
        { params: { third_party: vendorId, page_size: 100 } }
      );
      return data;
    },
    enabled: !!vendorId,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Vendor>) =>
      apiClient.post<Vendor>("/third-parties/third-parties/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export function useUpdateVendor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Vendor>) =>
      apiClient.patch<Vendor>(`/third-parties/third-parties/${id}/`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
      qc.invalidateQueries({ queryKey: ["vendor", id] });
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/third-parties/third-parties/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export function useCreateVendorReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<VendorReview>) =>
      apiClient.post<VendorReview>("/third-parties/third-party-reviews/", payload).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["vendorReviews", variables.third_party] });
    },
  });
}

export function useUpdateVendorReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<VendorReview>) =>
      apiClient.patch<VendorReview>(`/third-parties/third-party-reviews/${id}/`, payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["vendorReviews", data.third_party] });
    },
  });
}
