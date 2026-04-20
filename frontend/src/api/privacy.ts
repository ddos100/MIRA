import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LegalBasis =
  | "consent"
  | "contract"
  | "legal_obligation"
  | "vital_interests"
  | "public_task"
  | "legitimate_interests";

export interface ProcessingActivity {
  id: string;
  name: string;
  description: string;
  controller: string;
  processor: string;
  purpose: string;
  legal_basis: LegalBasis;
  data_subjects: string;
  personal_data_categories: string;
  special_category_data: boolean;
  retention_period: string;
  third_party_recipients: string[];
  third_party_recipients_detail?: { id: string; name: string }[];
  cross_border_transfer: boolean;
  transfer_safeguards: string;
  security_measures: string;
  owner: string | null;
  owner_detail?: { id: string; full_name: string; email: string };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DPIAStatus = "draft" | "in_review" | "approved" | "rejected";
export type ResidualRiskLevel = "low" | "medium" | "high" | "very_high";

export interface PrivacyRiskSummary {
  id: string;
  title: string;
  status: string;
  residual_score: number;
  category_name: string | null;
}

export interface DPIA {
  id: string;
  processing_activity: string;
  processing_activity_detail?: { id: string; name: string };
  title: string;
  description: string;
  assessor: string | null;
  assessor_detail?: { id: string; full_name: string; email: string };
  status: DPIAStatus;
  necessity_assessment: string;
  proportionality_assessment: string;
  risk_description: string;
  mitigation_measures: string;
  residual_risk_level: ResidualRiskLevel | null;
  dpo_consultation_required: boolean;
  dpo_consulted_date: string | null;
  dpo_opinion: string;
  approved_at: string | null;
  review_date: string | null;
  privacy_risks: string[];
  privacy_risks_detail?: PrivacyRiskSummary[];
  created_at: string;
  updated_at: string;
}

export type DSRRequestType =
  | "access"
  | "erasure"
  | "portability"
  | "rectification"
  | "restriction"
  | "objection";

export type DSRStatus =
  | "received"
  | "verified"
  | "in_progress"
  | "completed"
  | "denied"
  | "withdrawn";

export interface DSR {
  id: string;
  request_type: DSRRequestType;
  status: DSRStatus;
  data_subject_name: string;
  data_subject_email: string;
  description: string;
  handler: string | null;
  handler_detail?: { id: string; full_name: string; email: string };
  received_at: string;
  deadline: string;
  completed_at: string | null;
  response_notes: string;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProcessingActivityParams {
  search?: string;
  legal_basis?: LegalBasis | "";
  is_active?: boolean | "";
  cross_border_transfer?: boolean | "";
  page?: number;
  page_size?: number;
}

export interface DPIAParams {
  search?: string;
  status?: DPIAStatus | "";
  residual_risk_level?: ResidualRiskLevel | "";
  page?: number;
  page_size?: number;
}

export interface DSRParams {
  search?: string;
  request_type?: DSRRequestType | "";
  status?: DSRStatus | "";
  page?: number;
  page_size?: number;
}

// ─── Processing Activity Hooks ────────────────────────────────────────────────

export function useProcessingActivities(params: ProcessingActivityParams = {}) {
  return useQuery({
    queryKey: ["processingActivities", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProcessingActivity>>(
        "/privacy/processing-activities/",
        { params }
      );
      return data;
    },
  });
}

export function useProcessingActivity(id: string) {
  return useQuery({
    queryKey: ["processingActivity", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ProcessingActivity>(
        `/privacy/processing-activities/${id}/`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProcessingActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ProcessingActivity>) =>
      apiClient.post<ProcessingActivity>("/privacy/processing-activities/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["processingActivities"] }),
  });
}

export function useUpdateProcessingActivity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ProcessingActivity>) =>
      apiClient.patch<ProcessingActivity>(`/privacy/processing-activities/${id}/`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processingActivities"] });
      qc.invalidateQueries({ queryKey: ["processingActivity", id] });
    },
  });
}

export function useDeleteProcessingActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/privacy/processing-activities/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["processingActivities"] }),
  });
}

// ─── DPIA Hooks ────────────────────────────────────────────────────────────────

export function useDPIAs(params: DPIAParams = {}) {
  return useQuery({
    queryKey: ["dpias", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DPIA>>(
        "/privacy/dpias/",
        { params }
      );
      return data;
    },
  });
}

export function useDPIA(id: string) {
  return useQuery({
    queryKey: ["dpia", id],
    queryFn: async () => {
      const { data } = await apiClient.get<DPIA>(`/privacy/dpias/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateDPIA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DPIA>) =>
      apiClient.post<DPIA>("/privacy/dpias/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dpias"] }),
  });
}

export function useUpdateDPIA(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DPIA>) =>
      apiClient.patch<DPIA>(`/privacy/dpias/${id}/`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dpias"] });
      qc.invalidateQueries({ queryKey: ["dpia", id] });
    },
  });
}

// ─── DSR Hooks ─────────────────────────────────────────────────────────────────

export function useDSRs(params: DSRParams = {}) {
  return useQuery({
    queryKey: ["dsrs", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DSR>>(
        "/privacy/data-subject-requests/",
        { params }
      );
      return data;
    },
  });
}

export function useDSR(id: string) {
  return useQuery({
    queryKey: ["dsr", id],
    queryFn: async () => {
      const { data } = await apiClient.get<DSR>(
        `/privacy/data-subject-requests/${id}/`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateDSR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DSR>) =>
      apiClient.post<DSR>("/privacy/data-subject-requests/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dsrs"] }),
  });
}

export function useUpdateDSR(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DSR>) =>
      apiClient.patch<DSR>(`/privacy/data-subject-requests/${id}/`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dsrs"] });
      qc.invalidateQueries({ queryKey: ["dsr", id] });
    },
  });
}
