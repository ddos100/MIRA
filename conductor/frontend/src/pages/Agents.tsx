import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi, frameworksApi } from '@/api/client'
import { Play, Square, RefreshCw, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react'

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className="bg-brand h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function RunStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-800', running: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800', failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

function SeverityBadge({ sev }: { sev: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800', low: 'bg-blue-100 text-blue-800', info: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase ${map[sev] ?? 'bg-gray-100'}`}>{sev}</span>
}

export default function Agents() {
  const qc = useQueryClient()
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState(false)
  const [form, setForm] = useState({ run_type: 'full', framework_id: '' })
  const eventSource = useRef<EventSource | null>(null)

  const { data: frameworks } = useQuery({ queryKey: ['frameworks'], queryFn: () => frameworksApi.list().then(r => r.data) })
  const { data: runs, refetch: refetchRuns } = useQuery({
    queryKey: ['runs'],
    queryFn: () => agentsApi.listRuns().then(r => r.data),
    refetchInterval: 5000,
  })
  const { data: runDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['run', selectedRun],
    queryFn: () => agentsApi.getRun(selectedRun!).then(r => r.data),
    enabled: !!selectedRun,
    refetchInterval: (d) => d?.status === 'running' ? 3000 : false,
  })

  const startMut = useMutation({
    mutationFn: () => agentsApi.run({ run_type: form.run_type, framework_id: form.framework_id || undefined }),
    onSuccess: (res) => { setSelectedRun(res.data.run_id); qc.invalidateQueries({ queryKey: ['runs'] }) },
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => agentsApi.cancelRun(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['runs'] }); refetchDetail() },
  })

  const activeRun = runs?.find((r: any) => r.status === 'running')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
        <p className="text-gray-500 mt-1">Orchestrate automated control validation, evidence collection, and reporting</p>
      </div>

      {/* Run Launcher */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Launch New Run</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Run Type</label>
            <select value={form.run_type} onChange={e => setForm(f => ({ ...f, run_type: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand">
              {['full', 'validate', 'collect', 'review', 'report'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Framework (optional)</label>
            <select value={form.framework_id} onChange={e => setForm(f => ({ ...f, framework_id: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand">
              <option value="">All frameworks</option>
              {frameworks?.map((fw: any) => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => startMut.mutate()}
            disabled={startMut.isPending || !!activeRun}
            className="flex items-center gap-2 px-5 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-light disabled:opacity-50"
          >
            <Play size={15} /> {startMut.isPending ? 'Starting…' : 'Start Run'}
          </button>
          {activeRun && (
            <button onClick={() => cancelMut.mutate(activeRun.id)}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
              <Square size={14} /> Cancel
            </button>
          )}
        </div>

        {/* Active run progress */}
        {activeRun && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-brand">Running: {activeRun.current_agent ?? 'orchestrator'}</span>
              <span className="text-blue-600">{activeRun.progress_pct}%</span>
            </div>
            <ProgressBar pct={activeRun.progress_pct} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Run history */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
            Run History
            <button onClick={() => refetchRuns()} className="text-gray-400 hover:text-brand"><RefreshCw size={14} /></button>
          </h2>
          <div className="space-y-2">
            {!runs?.length && <p className="text-sm text-gray-400 text-center py-4">No runs yet</p>}
            {runs?.map((r: any) => (
              <div
                key={r.id}
                onClick={() => setSelectedRun(r.id)}
                className={`p-3 rounded-lg cursor-pointer border transition-colors
                  ${selectedRun === r.id ? 'border-brand bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800 capitalize">{r.run_type} run</span>
                  <RunStatusBadge status={r.status} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">{r.started_at ? new Date(r.started_at).toLocaleString() : 'Queued'}</span>
                  {r.compliance_score != null && (
                    <span className="text-xs font-bold text-brand">{r.compliance_score.toFixed(1)}%</span>
                  )}
                </div>
                {r.status === 'running' && <ProgressBar pct={r.progress_pct} />}
              </div>
            ))}
          </div>
        </div>

        {/* Run detail */}
        {runDetail && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Run Detail</h2>
              <RunStatusBadge status={runDetail.status} />
            </div>
            {runDetail.compliance_score != null && (
              <div className="text-3xl font-bold text-brand">{runDetail.compliance_score.toFixed(1)}%
                <span className="text-sm font-normal text-gray-400 ml-2">compliance score</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Findings</p>
                <p className="font-bold text-gray-900">{runDetail.findings_count}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Evidence</p>
                <p className="font-bold text-gray-900">{runDetail.evidence_collected}</p>
              </div>
            </div>

            {/* Findings */}
            {runDetail.findings?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Findings</h3>
                <div className="space-y-2">
                  {runDetail.findings.map((f: any) => (
                    <div key={f.id} className="p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <SeverityBadge sev={f.severity} />
                        <span className="text-sm font-medium text-gray-800">{f.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{f.description?.slice(0, 120)}…</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps */}
            <div>
              <button onClick={() => setExpandedSteps(!expandedSteps)}
                className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                {expandedSteps ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Agent Steps ({runDetail.steps?.length ?? 0})
              </button>
              {expandedSteps && (
                <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                  {runDetail.steps?.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50">
                      <span className="text-gray-400 w-6 text-right">{s.step_number}</span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{s.agent_type}</span>
                      <span className="text-gray-700 flex-1 truncate">{s.action}</span>
                      {s.tool_used && <span className="text-blue-500">→ {s.tool_used}</span>}
                      {s.duration_ms && <span className="text-gray-400">{s.duration_ms}ms</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
