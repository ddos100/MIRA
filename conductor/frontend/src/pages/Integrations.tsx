import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { integrationsApi } from '@/api/client'
import { Plus, Plug, CheckCircle, XCircle, Play, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

const CONNECTOR_TYPES = ['db', 'rest_api', 'ssh', 'webhook', 'mira'] as const
type ConnectorType = typeof CONNECTOR_TYPES[number]

const TYPE_FIELDS: Record<ConnectorType, { key: string; label: string; type?: string; isCredential?: boolean }[]> = {
  db: [
    { key: 'dialect', label: 'Dialect (postgresql|mysql|mssql|sqlite)' },
    { key: 'host', label: 'Host' },
    { key: 'port', label: 'Port' },
    { key: 'database', label: 'Database' },
    { key: 'username', label: 'Username', isCredential: true },
    { key: 'password', label: 'Password', type: 'password', isCredential: true },
  ],
  rest_api: [
    { key: 'base_url', label: 'Base URL' },
    { key: 'auth_type', label: 'Auth Type (bearer|basic|api_key|none)' },
    { key: 'health_path', label: 'Health Check Path' },
    { key: 'token', label: 'Token / API Key', type: 'password', isCredential: true },
    { key: 'username', label: 'Username (basic auth)', isCredential: true },
    { key: 'password', label: 'Password (basic auth)', type: 'password', isCredential: true },
  ],
  ssh: [
    { key: 'host', label: 'Host' },
    { key: 'port', label: 'Port (default 22)' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', type: 'password', isCredential: true },
    { key: 'private_key', label: 'Private Key (PEM)', type: 'password', isCredential: true },
  ],
  webhook: [
    { key: 'hmac_secret', label: 'HMAC Secret (optional)', type: 'password', isCredential: true },
  ],
  mira: [
    { key: 'base_url', label: 'MIRA API Base URL' },
    { key: 'api_key', label: 'API Key', type: 'password', isCredential: true },
  ],
}

function TestStatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={15} className="text-green-500" />
  if (status === 'failed') return <XCircle size={15} className="text-red-500" />
  return <span className="w-[15px] h-[15px] rounded-full bg-gray-200 inline-block" />
}

export default function Integrations() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [connType, setConnType] = useState<ConnectorType>('rest_api')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showRuns, setShowRuns] = useState(false)

  const { data: connectors, isLoading } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => integrationsApi.list().then(r => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['connector', selectedId],
    queryFn: () => integrationsApi.get(selectedId!).then(r => r.data),
    enabled: !!selectedId,
  })

  const { data: runs } = useQuery({
    queryKey: ['connector-runs', selectedId],
    queryFn: () => integrationsApi.listRuns(selectedId!).then(r => r.data),
    enabled: !!selectedId && showRuns,
  })

  const createMut = useMutation({
    mutationFn: () => {
      const fields = TYPE_FIELDS[connType]
      const config: Record<string, string> = {}
      const credentials: Record<string, string> = {}
      fields.forEach(f => {
        if (formValues[f.key]) {
          if (f.isCredential) credentials[f.key] = formValues[f.key]
          else config[f.key] = formValues[f.key]
        }
      })
      return integrationsApi.create({ name, description, connector_type: connType, config, credentials })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['connectors'] }); setShowCreate(false); setFormValues({}); setName('') },
  })

  const testMut = useMutation({
    mutationFn: (id: string) => integrationsApi.test(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connectors'] }),
  })

  const runMut = useMutation({
    mutationFn: (id: string) => integrationsApi.run(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connector-runs', selectedId] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => integrationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['connectors'] }); setSelectedId(null) },
  })

  const typeBadge: Record<string, string> = {
    db: 'bg-purple-100 text-purple-700', rest_api: 'bg-blue-100 text-blue-700',
    ssh: 'bg-gray-100 text-gray-700', webhook: 'bg-orange-100 text-orange-700',
    mira: 'bg-indigo-100 text-indigo-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-500 mt-1">Connect data sources: databases, APIs, SSH hosts, webhooks, and MIRA GRC</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-light">
          <Plus size={15} /> Add Connector
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">New Connector</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Connector Type</label>
              <select value={connType} onChange={e => { setConnType(e.target.value as ConnectorType); setFormValues({}) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand">
                {CONNECTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand" />
            </div>
            {TYPE_FIELDS[connType].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  {f.label} {f.isCredential && <span className="text-orange-400">🔒</span>}
                </label>
                <input
                  type={f.type ?? 'text'}
                  value={formValues[f.key] ?? ''}
                  onChange={e => setFormValues(v => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">🔒 Credentials are encrypted at rest using Fernet symmetric encryption.</p>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-light">
              Create
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connector list */}
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
          {connectors?.map((c: any) => (
            <div key={c.id} onClick={() => setSelectedId(c.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors
                ${selectedId === c.id ? 'border-brand bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <div className="flex items-center gap-2">
                <Plug size={15} className="text-gray-400" />
                <span className="font-semibold text-gray-800 flex-1 truncate">{c.name}</span>
                <TestStatusIcon status={c.last_test_status} />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeBadge[c.connector_type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {c.connector_type}
                </span>
                {c.last_tested_at && (
                  <span className="text-xs text-gray-400">tested {new Date(c.last_tested_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
          {!isLoading && !connectors?.length && (
            <p className="text-sm text-gray-400 py-4 text-center">No connectors yet</p>
          )}
        </div>

        {/* Detail */}
        {detail && (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{detail.name}</h2>
                <p className="text-sm text-gray-400">{detail.description}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${typeBadge[detail.connector_type] ?? ''}`}>
                  {detail.connector_type}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => testMut.mutate(detail.id)} disabled={testMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
                  <CheckCircle size={13} /> Test
                </button>
                <button onClick={() => runMut.mutate(detail.id)} disabled={runMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-sm hover:bg-brand-light">
                  <Play size={13} /> Run
                </button>
                <button onClick={() => { if (confirm('Delete connector?')) deleteMut.mutate(detail.id) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {detail.connector_type === 'webhook' && detail.config?.token && (
              <div className="p-3 bg-gray-50 rounded-lg text-xs font-mono break-all">
                <p className="text-gray-500 mb-1 font-sans font-medium">Inbound Webhook URL:</p>
                <p className="text-brand">/api/v1/integrations/webhooks/receive/{detail.config.token}</p>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Last test: <span className={detail.last_test_status === 'success' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {detail.last_test_status}
              </span>
              {detail.last_tested_at && ` — ${new Date(detail.last_tested_at).toLocaleString()}`}
            </div>

            <button onClick={() => setShowRuns(!showRuns)}
              className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              {showRuns ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Run History
            </button>
            {showRuns && runs && (
              <div className="space-y-1">
                {runs.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{r.trigger}</span>
                    <span className={r.status === 'completed' ? 'text-green-600 font-medium' : 'text-red-600'}>{r.status}</span>
                    <span className="text-gray-400">{r.records_collected} records</span>
                    <span className="text-gray-400">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
