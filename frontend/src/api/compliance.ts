import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceFramework {
  id: string;
  name: string;
  short_name: string;
  version: string;
  description: string;
  issuing_body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: string;
  framework: string;
  parent: string | null;
  ref_code: string;
  title: string;
  description: string;
  guidance: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface ComplianceProgram {
  id: string;
  name: string;
  framework: string;
  framework_name?: string;
  owner: string | null;
  owner_name?: string;
  status: "planned" | "in_progress" | "completed" | "suspended";
  target_date: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface GapSummary {
  program: string;
  total: number;
  by_status: {
    not_assessed: number;
    compliant: number;
    partially_compliant: number;
    non_compliant: number;
    not_applicable: number;
  };
}

export type AssessmentStatus =
  | "not_assessed"
  | "compliant"
  | "partially_compliant"
  | "non_compliant"
  | "not_applicable";

export interface ComplianceAssessment {
  id: string;
  program: string;
  requirement: string;
  requirement_ref_code?: string;
  requirement_title?: string;
  status: AssessmentStatus;
  notes: string;
  assessor: string | null;
  assessor_name?: string;
  assessment_date: string | null;
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

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const complianceKeys = {
  all: ["compliance"] as const,
  frameworks: () => [...complianceKeys.all, "frameworks"] as const,
  frameworkLists: () => [...complianceKeys.frameworks(), "list"] as const,
  frameworkList: (params?: Record<string, unknown>) =>
    [...complianceKeys.frameworkLists(), params] as const,
  frameworkDetail: (id: string) =>
    [...complianceKeys.frameworks(), "detail", id] as const,

  programs: () => [...complianceKeys.all, "programs"] as const,
  programLists: () => [...complianceKeys.programs(), "list"] as const,
  programList: (params?: Record<string, unknown>) =>
    [...complianceKeys.programLists(), params] as const,
  programDetail: (id: string) =>
    [...complianceKeys.programs(), "detail", id] as const,
  programGapSummary: (id: string) =>
    [...complianceKeys.programs(), "gap-summary", id] as const,

  requirements: () => [...complianceKeys.all, "requirements"] as const,
  requirementList: (params?: Record<string, unknown>) =>
    [...complianceKeys.requirements(), "list", params] as const,

  assessments: () => [...complianceKeys.all, "assessments"] as const,
  assessmentList: (params?: Record<string, unknown>) =>
    [...complianceKeys.assessments(), "list", params] as const,
  assessmentDetail: (id: string) =>
    [...complianceKeys.assessments(), "detail", id] as const,
};

// ─── Framework Hooks ──────────────────────────────────────────────────────────

export function useFrameworks(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: complianceKeys.frameworkList(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ComplianceFramework>>(
        "/compliance/frameworks/",
        { params: { page_size: 100, ...params } }
      );
      return data;
    },
  });
}

// ─── Program Hooks ────────────────────────────────────────────────────────────

export function usePrograms(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: complianceKeys.programList(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ComplianceProgram>>(
        "/compliance/programs/",
        { params: { page_size: 100, ...params } }
      );
      return data;
    },
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: complianceKeys.programDetail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ComplianceProgram>(
        `/compliance/programs/${id}/`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useProgramGapSummary(id: string) {
  return useQuery({
    queryKey: complianceKeys.programGapSummary(id),
    queryFn: async () => {
      const { data } = await apiClient.get<GapSummary>(
        `/compliance/programs/${id}/gap-summary/`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ComplianceProgram>) => {
      const { data } = await apiClient.post<ComplianceProgram>(
        "/compliance/programs/",
        payload
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.programLists() });
    },
  });
}

export function useUpdateProgram(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ComplianceProgram>) => {
      const { data } = await apiClient.patch<ComplianceProgram>(
        `/compliance/programs/${id}/`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.programLists() });
      queryClient.invalidateQueries({ queryKey: complianceKeys.programDetail(id) });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/compliance/programs/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.programLists() });
    },
  });
}

// ─── Requirement Hooks ────────────────────────────────────────────────────────

export function useRequirements(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: complianceKeys.requirementList(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Requirement>>(
        "/compliance/requirements/",
        { params: { page_size: 500, ...params } }
      );
      return data;
    },
    enabled: params !== undefined ? Object.keys(params).length > 0 : true,
  });
}

// ─── Assessment Hooks ─────────────────────────────────────────────────────────

export function useAssessments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: complianceKeys.assessmentList(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ComplianceAssessment>>(
        "/compliance/assessments/",
        { params: { page_size: 500, ...params } }
      );
      return data;
    },
  });
}

export function useUpdateAssessment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Pick<ComplianceAssessment, "status" | "notes" | "assessment_date" | "assessor">>
    ) => {
      const { data } = await apiClient.patch<ComplianceAssessment>(
        `/compliance/assessments/${id}/`,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.assessmentList() });
      queryClient.invalidateQueries({
        queryKey: complianceKeys.programGapSummary(data.program),
      });
    },
  });
}
