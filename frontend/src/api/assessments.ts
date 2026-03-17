import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const TMPL_EP = "/assessments/assessment-templates/";
const QQ_EP = "/assessments/questions/";
const ASSESS_EP = "/assessments/assessments/";
const RESP_EP = "/assessments/assessment-responses/";

export const assessmentKeys = {
  templates: () => ["assessment-templates"] as const,
  templateList: (p: object) => [...assessmentKeys.templates(), p] as const,
  templateDetail: (id: string) => [...assessmentKeys.templates(), id] as const,
  assessments: () => ["assessments"] as const,
  assessmentList: (p: object) => [...assessmentKeys.assessments(), p] as const,
  assessmentDetail: (id: string) => [...assessmentKeys.assessments(), id] as const,
};

export function useAssessmentTemplates(params?: Record<string, unknown>) {
  return useQuery({ queryKey: assessmentKeys.templateList(params ?? {}), queryFn: () => apiClient.get(TMPL_EP, { params }).then(r => r.data) });
}
export function useAssessmentTemplate(id: string) {
  return useQuery({ queryKey: assessmentKeys.templateDetail(id), queryFn: () => apiClient.get(`${TMPL_EP}${id}/`).then(r => r.data), enabled: !!id });
}
export function useTemplateQuestions(templateId: string) {
  return useQuery({ queryKey: ["questions", templateId], queryFn: () => apiClient.get(QQ_EP, { params: { template: templateId, page_size: 100 } }).then(r => r.data.results), enabled: !!templateId });
}
export function useAssessments(params?: Record<string, unknown>) {
  return useQuery({ queryKey: assessmentKeys.assessmentList(params ?? {}), queryFn: () => apiClient.get(ASSESS_EP, { params }).then(r => r.data) });
}
export function useAssessment(id: string) {
  return useQuery({ queryKey: assessmentKeys.assessmentDetail(id), queryFn: () => apiClient.get(`${ASSESS_EP}${id}/`).then(r => r.data), enabled: !!id });
}
export function useAssessmentResponses(assessmentId: string) {
  return useQuery({ queryKey: ["assessment-responses", assessmentId], queryFn: () => apiClient.get(RESP_EP, { params: { assessment: assessmentId, page_size: 100 } }).then(r => r.data.results), enabled: !!assessmentId });
}
export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post(TMPL_EP, d).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: assessmentKeys.templates() }) });
}
export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.patch(`${TMPL_EP}${id}/`, d).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: assessmentKeys.templates() }); qc.invalidateQueries({ queryKey: assessmentKeys.templateDetail(id) }); } });
}
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiClient.delete(`${TMPL_EP}${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: assessmentKeys.templates() }) });
}
export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post(ASSESS_EP, d).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: assessmentKeys.assessments() }) });
}
export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiClient.delete(`${ASSESS_EP}${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: assessmentKeys.assessments() }) });
}
export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post(QQ_EP, d).then(r => r.data), onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["questions", v.template as string] }) });
}
export function useUpdateQuestion(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.patch(`${QQ_EP}${id}/`, d).then(r => r.data), onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["questions", v.template as string] }) });
}
export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, templateId }: { id: string; templateId: string }) => apiClient.delete(`${QQ_EP}${id}/`).then(() => templateId), onSuccess: (templateId) => qc.invalidateQueries({ queryKey: ["questions", templateId] }) });
}
