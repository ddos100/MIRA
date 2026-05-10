import { useQuery } from '@tanstack/react-query'
import { agentsApi, reportsApi, evidenceApi, frameworksApi } from '@/api/client'
import { Shield, Bot, Database, FileBarChart, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

function StatCard({ label, value, sub, Icon, color }: { label: string; value: string | number; sub?: string; Icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
    info: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${map[severity] ?? 'bg-gray-100 text-gray-600'}`}>
      {severity}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    running: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default function Dashboard() {
  const { data: runs } = useQuery({ queryKey: ['runs'], queryFn: () => agentsApi.listRuns({ limit: '5' }).then(r => r.data) })
  const { data: findings } = useQuery({ queryKey: ['findings'], queryFn: () => agentsApi.listFindings({ limit: '10' }).then(r => r.data) })
  const { data: frameworks } = useQuery({ queryKey: ['frameworks'], queryFn: () => frameworksApi.list().then(r => r.data) })
  const { data: reports } = useQuery({ queryKey: ['reports'], queryFn: () => reportsApi.list().then(r => r.data) })
  const { data: evidence } = useQuery({ queryKey: ['evidence-count'], queryFn: () => evidenceApi.list({ limit: '1' }).then(r => r.data) })

  const latestRun = runs?.[0]
  const openFindings = findings?.filter((f: any) => f.status === 'open') ?? []
  const criticalCount = openFindings.filter((f: any) => f.severity === 'critical').length
  const highCount = openFindings.filter((f: any) => f.severity === 'high').length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">AI-powered cybersecurity compliance overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Compliance Score" value={latestRun?.compliance_score ? `${latestRun.compliance_score.toFixed(1)}%` : '—'} sub="Latest run" Icon={Shield} color="bg-brand" />
        <StatCard label="Open Findings" value={openFindings.length} sub={`${criticalCount} critical · ${highCount} high`} Icon={AlertTriangle} color="bg-orange-500" />
        <StatCard label="Frameworks" value={frameworks?.length ?? 0} sub="Loaded" Icon={Shield} color="bg-indigo-500" />
        <StatCard label="Reports Generated" value={reports?.length ?? 0} Icon={FileBarChart} color="bg-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Bot size={18} />Recent Agent Runs</h2>
          {!runs?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">No runs yet. Start your first agent run from the Agents page.</p>
          ) : (
            <div className="space-y-3">
              {runs.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.run_type} run</p>
                    <p className="text-xs text-gray-400">{r.started_at ? new Date(r.started_at).toLocaleString() : 'Pending'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.compliance_score != null && (
                      <span className="text-sm font-bold text-brand">{r.compliance_score.toFixed(1)}%</span>
                    )}
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Findings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><AlertTriangle size={18} />Open Findings</h2>
          {!openFindings.length ? (
            <p className="text-sm text-gray-400 py-4 text-center flex items-center justify-center gap-2">
              <CheckCircle size={16} className="text-green-500" /> No open findings
            </p>
          ) : (
            <div className="space-y-3">
              {openFindings.slice(0, 8).map((f: any) => (
                <div key={f.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <SeverityBadge severity={f.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.title}</p>
                    {f.needs_human_review && (
                      <p className="text-xs text-orange-500 flex items-center gap-1 mt-0.5"><Clock size={10} />Needs human review</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
