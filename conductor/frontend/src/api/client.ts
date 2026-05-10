import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// ── Documents ─────────────────────────────────────────────────────
export const documentsApi = {
  list: (params?: Record<string, string>) => api.get('/documents/', { params }),
  get: (id: string) => api.get(`/documents/${id}`),
  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  reparse: (id: string) => api.post(`/documents/${id}/reparse`),
  delete: (id: string) => api.delete(`/documents/${id}`),
}

// ── Frameworks ────────────────────────────────────────────────────
export const frameworksApi = {
  list: () => api.get('/frameworks/'),
  get: (id: string) => api.get(`/frameworks/${id}`),
  create: (body: Record<string, unknown>) => api.post('/frameworks/', body),
  update: (id: string, body: Record<string, unknown>) => api.put(`/frameworks/${id}`, body),
  delete: (id: string) => api.delete(`/frameworks/${id}`),
  export: (id: string) => api.get(`/frameworks/${id}/export`),
  importFile: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/frameworks/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  loadBuiltins: () => api.post('/frameworks/load-builtins'),
  addControl: (fwId: string, body: Record<string, unknown>) => api.post(`/frameworks/${fwId}/controls`, body),
  updateControl: (fwId: string, ctrlId: string, body: Record<string, unknown>) => api.put(`/frameworks/${fwId}/controls/${ctrlId}`, body),
  deleteControl: (fwId: string, ctrlId: string) => api.delete(`/frameworks/${fwId}/controls/${ctrlId}`),
}

// ── Evidence ──────────────────────────────────────────────────────
export const evidenceApi = {
  list: (params?: Record<string, string>) => api.get('/evidence/', { params }),
  get: (id: string) => api.get(`/evidence/${id}`),
  upload: (title: string, description: string, file: File) => {
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', description)
    fd.append('file', file)
    return api.post('/evidence/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  verify: (id: string) => api.post(`/evidence/${id}/verify`),
  link: (id: string, controlId?: string, requirementId?: string) =>
    api.post(`/evidence/${id}/link`, { control_id: controlId, requirement_id: requirementId }),
  delete: (id: string) => api.delete(`/evidence/${id}`),
  downloadUrl: (id: string) => `${BASE}/api/v1/evidence/${id}/download`,
}

// ── Agents ────────────────────────────────────────────────────────
export const agentsApi = {
  run: (body: Record<string, unknown>) => api.post('/agents/run', body),
  listRuns: (params?: Record<string, string>) => api.get('/agents/runs', { params }),
  getRun: (id: string) => api.get(`/agents/runs/${id}`),
  cancelRun: (id: string) => api.post(`/agents/runs/${id}/cancel`),
  listFindings: (params?: Record<string, string>) => api.get('/agents/findings', { params }),
  streamUrl: (id: string) => `${BASE}/api/v1/agents/runs/${id}/stream`,
}

// ── Integrations ──────────────────────────────────────────────────
export const integrationsApi = {
  list: () => api.get('/integrations/'),
  get: (id: string) => api.get(`/integrations/${id}`),
  create: (body: Record<string, unknown>) => api.post('/integrations/', body),
  update: (id: string, body: Record<string, unknown>) => api.put(`/integrations/${id}`, body),
  delete: (id: string) => api.delete(`/integrations/${id}`),
  test: (id: string) => api.post(`/integrations/${id}/test`),
  run: (id: string) => api.post(`/integrations/${id}/run`),
  listRuns: (id: string) => api.get(`/integrations/${id}/runs`),
}

// ── Reports ───────────────────────────────────────────────────────
export const reportsApi = {
  list: () => api.get('/reports/'),
  get: (id: string) => api.get(`/reports/${id}`),
  exportUrl: (id: string, fmt: string) => `${BASE}/api/v1/reports/${id}/export/${fmt}`,
  delete: (id: string) => api.delete(`/reports/${id}`),
}

// ── Ollama ────────────────────────────────────────────────────────
export const ollamaApi = {
  health: () => api.get('/ollama/health'),
  models: () => api.get('/ollama/models'),
  pull: (model: string) => api.post('/ollama/models/pull', { model }),
}
