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
  owner: string | null;
  owner_name?: string;
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

  frameworkTemplates: () => [...complianceKeys.all, "framework-templates"] as const,
  frameworkTemplateList: (params?: Record<string, unknown>) =>
    [...complianceKeys.frameworkTemplates(), "list", params] as const,

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

// ─── Extended Types ───────────────────────────────────────────────────────────

export interface RequirementMapping {
  id: string;
  source: string;
  source_ref: string;
  source_title: string;
  source_framework: string;
  target: string;
  target_ref: string;
  target_title: string;
  target_framework: string;
  relationship: "equivalent" | "subset" | "superset" | "related";
  notes: string;
  created_at: string;
}

export interface StatusRule {
  id: string;
  name: string;
  description: string;
  content_type: number;
  content_type_label?: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  target_status: string;
  rule_status: "active" | "inactive";
  last_run_at: string | null;
  last_affected_count: number;
  created_at: string;
}

// extend query keys
const mappingKey = (params?: Record<string, unknown>) =>
  ["compliance", "requirement-mappings", params] as const;

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

export function useFramework(id: string) {
  return useQuery({
    queryKey: complianceKeys.frameworkDetail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ComplianceFramework>(
        `/compliance/frameworks/${id}/`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ComplianceFramework>) => {
      const { data } = await apiClient.post<ComplianceFramework>(
        "/compliance/frameworks/",
        payload
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.frameworkLists() }),
  });
}

export function useUpdateFramework(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ComplianceFramework>) => {
      const { data } = await apiClient.patch<ComplianceFramework>(
        `/compliance/frameworks/${id}/`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.frameworkLists() });
      qc.invalidateQueries({ queryKey: complianceKeys.frameworkDetail(id) });
    },
  });
}

export function useDeleteFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/compliance/frameworks/${id}/`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.frameworkLists() }),
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

export function useRequirement(id: string) {
  return useQuery({
    queryKey: [...complianceKeys.requirements(), "detail", id] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<Requirement>(
        `/compliance/requirements/${id}/`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Requirement>) => {
      const { data } = await apiClient.post<Requirement>(
        "/compliance/requirements/",
        payload
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.requirements() }),
  });
}

export function useUpdateRequirement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Requirement>) => {
      const { data } = await apiClient.patch<Requirement>(
        `/compliance/requirements/${id}/`,
        payload
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.requirements() }),
  });
}

export function useDeleteRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/compliance/requirements/${id}/`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.requirements() }),
  });
}

export function useRequirementLinkedPolicies(id: string) {
  return useQuery({
    queryKey: [...complianceKeys.requirements(), "linked-policies", id] as const,
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/compliance/requirements/${id}/linked-policies/`
      );
      return (data?.results ?? data) as Array<{
        id: string;
        title: string;
        status: string;
        version: string;
      }>;
    },
    enabled: !!id,
  });
}

export function useRequirementLinkedControls(id: string) {
  return useQuery({
    queryKey: [...complianceKeys.requirements(), "linked-controls", id] as const,
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/compliance/requirements/${id}/linked-controls/`
      );
      return (data?.results ?? data) as Array<{
        id: string;
        title: string;
        status: string;
        control_type: string;
      }>;
    },
    enabled: !!id,
  });
}

export function useRequirementMappings(requirementId: string) {
  return useQuery({
    queryKey: [...complianceKeys.requirements(), "mappings", requirementId] as const,
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/compliance/requirements/${requirementId}/mappings/`
      );
      return (data?.results ?? data) as RequirementMapping[];
    },
    enabled: !!requirementId,
  });
}

export function useAllRequirementMappings(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: mappingKey(params),
    queryFn: async () => {
      const { data } = await apiClient.get("/compliance/requirement-mappings/", {
        params: { page_size: 200, ...params },
      });
      return (data?.results ?? data) as RequirementMapping[];
    },
  });
}

export function useCreateRequirementMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<RequirementMapping, "id" | "created_at" | "source_ref" | "source_title" | "source_framework" | "target_ref" | "target_title" | "target_framework">
    ) => {
      const { data } = await apiClient.post<RequirementMapping>(
        "/compliance/requirement-mappings/",
        payload
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["compliance", "requirement-mappings"] }),
  });
}

export function useDeleteRequirementMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/compliance/requirement-mappings/${id}/`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["compliance", "requirement-mappings"] }),
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

// ─── Framework Template Hooks ─────────────────────────────────────────────────

export interface FrameworkTemplate {
  id: string;
  name: string;
  template_type: string;
  short_name: string;
  version: string;
  issuing_body: string;
  description: string;
  structure: Record<string, unknown>[];
  is_active: boolean;
  created_at: string;
}

export function useFrameworkTemplates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: complianceKeys.frameworkTemplateList(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<FrameworkTemplate>>(
        "/compliance/framework-templates/",
        { params: { page_size: 100, ...params } }
      );
      return data;
    },
  });
}

export function useCreateFrameworkTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FrameworkTemplate>) => {
      const { data } = await apiClient.post<FrameworkTemplate>(
        "/compliance/framework-templates/",
        payload
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.frameworkTemplates() }),
  });
}

export function useUpdateFrameworkTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FrameworkTemplate>) => {
      const { data } = await apiClient.patch<FrameworkTemplate>(
        `/compliance/framework-templates/${id}/`,
        payload
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.frameworkTemplates() }),
  });
}

export function useDeleteFrameworkTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/compliance/framework-templates/${id}/`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.frameworkTemplates() }),
  });
}

export function useInstantiateFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      name,
      version,
    }: {
      templateId: string;
      name?: string;
      version?: string;
    }) => {
      const { data } = await apiClient.post<ComplianceFramework>(
        `/compliance/framework-templates/${templateId}/instantiate/`,
        { name, version }
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.frameworkLists() }),
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
