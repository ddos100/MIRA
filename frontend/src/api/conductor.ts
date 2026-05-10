import { apiClient } from "@/api/client";
import type { AxiosResponse } from "axios";

// ─── API functions — return AxiosResponse so pages can .then(r => r.data) ──

export const conductorApi = {
  // Status
  getStatus: (): Promise<AxiosResponse> =>
    apiClient.get("/conductor/status/"),

  // Documents
  getDocuments: (): Promise<AxiosResponse> =>
    apiClient.get("/conductor/documents/"),

  uploadDocument: (formData: FormData): Promise<AxiosResponse> =>
    apiClient.post("/conductor/documents/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  reparseDocument: (id: string): Promise<AxiosResponse> =>
    apiClient.post(`/conductor/documents/${id}/reparse/`),

  deleteDocument: (id: string): Promise<AxiosResponse> =>
    apiClient.delete(`/conductor/documents/${id}/`),

  // Connectors
  getConnectors: (): Promise<AxiosResponse> =>
    apiClient.get("/conductor/connectors/"),

  createConnector: (data: object): Promise<AxiosResponse> =>
    apiClient.post("/conductor/connectors/", data),

  updateConnector: (id: string, data: object): Promise<AxiosResponse> =>
    apiClient.patch(`/conductor/connectors/${id}/`, data),

  deleteConnector: (id: string): Promise<AxiosResponse> =>
    apiClient.delete(`/conductor/connectors/${id}/`),

  testConnector: (id: string): Promise<AxiosResponse> =>
    apiClient.post(`/conductor/connectors/${id}/test/`),

  runConnector: (id: string): Promise<AxiosResponse> =>
    apiClient.post(`/conductor/connectors/${id}/run/`),

  // Runs
  getRuns: (params?: object): Promise<AxiosResponse> =>
    apiClient.get("/conductor/runs/", { params }),

  getRun: (id: string): Promise<AxiosResponse> =>
    apiClient.get(`/conductor/runs/${id}/`),

  createRun: (data: object): Promise<AxiosResponse> =>
    apiClient.post("/conductor/runs/", data),

  cancelRun: (id: string): Promise<AxiosResponse> =>
    apiClient.post(`/conductor/runs/${id}/cancel/`),

  // Findings
  getFindings: (params?: object): Promise<AxiosResponse> =>
    apiClient.get("/conductor/findings/", { params }),

  updateFinding: (id: string, data: object): Promise<AxiosResponse> =>
    apiClient.patch(`/conductor/findings/${id}/`, data),

  promoteFinding: (id: string): Promise<AxiosResponse> =>
    apiClient.post(`/conductor/findings/${id}/promote/`),

  // Reports
  getReports: (): Promise<AxiosResponse> =>
    apiClient.get("/conductor/reports/"),

  getReport: (id: string): Promise<AxiosResponse> =>
    apiClient.get(`/conductor/reports/${id}/`),

  deleteReport: (id: string): Promise<AxiosResponse> =>
    apiClient.delete(`/conductor/reports/${id}/`),

  exportReportPdf: (id: string): string =>
    `/api/v1/conductor/reports/${id}/export/pdf/`,

  // Ollama
  getOllamaHealth: (): Promise<AxiosResponse> =>
    apiClient.get("/conductor/ollama/health/"),

  getOllamaModels: (): Promise<AxiosResponse> =>
    apiClient.get("/conductor/ollama/models/"),

  pullOllamaModel: (model: string): Promise<AxiosResponse> =>
    apiClient.post("/conductor/ollama/models/", { model }),
};
