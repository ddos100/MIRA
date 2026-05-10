import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/client'
import { FileBarChart, Download, Trash2, CheckCircle, Clock } from 'lucide-react'
import { useState } from 'react'

export default function Reports() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list().then(r => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['report', selected],
    queryFn: () => reportsApi.get(selected!).then(r => r.data),
    enabled: !!selected,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); setSelected(null) },
  })

  const typeBadge: Record<string, string> = {
    audit: 'bg-blue-100 text-blue-700', executive: 'bg-purple-100 text-purple-700',
    gap_analysis: 'bg-orange-100 text-orange-700', remediation: 'bg-red-100 text-red-700',
    board: 'bg-indigo-100 text-indigo-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">AI-generated compliance reports with PDF export</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report list */}
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
          {!isLoading && !reports?.length && (
            <p className="text-sm text-gray-400 py-8 text-center">
              No reports yet. Run an agent to generate the first report.
            </p>
          )}
          {reports?.map((r: any) => (
            <div key={r.id} onClick={() => setSelected(r.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors
                ${selected === r.id ? 'border-brand bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <div className="flex items-start gap-2">
                <FileBarChart size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeBadge[r.report_type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.report_type}
                    </span>
                    {r.compliance_score != null && (
                      <span className="text-xs font-bold text-brand">{r.compliance_score.toFixed(1)}%</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {r.generated_at ? new Date(r.generated_at).toLocaleDateString() : 'Generating…'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Report detail */}
        {detail && (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{detail.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {detail.generated_at ? new Date(detail.generated_at).toLocaleString() : '—'} · by {detail.generated_by}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={reportsApi.exportUrl(detail.id, 'pdf')} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-sm hover:bg-brand-light">
                  <Download size={13} /> PDF
                </a>
                <button onClick={() => { if (confirm('Delete report?')) deleteMut.mutate(detail.id) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {detail.compliance_score != null && (
              <div className="p-4 bg-brand rounded-xl text-white">
                <p className="text-sm opacity-80">Overall Compliance Score</p>
                <p className="text-4xl font-bold mt-1">{detail.compliance_score.toFixed(1)}%</p>
              </div>
            )}

            {detail.findings_summary && (
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(detail.findings_summary.by_severity ?? {}).map(([sev, cnt]) => (
                  <div key={sev} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400 capitalize">{sev}</p>
                    <p className="text-xl font-bold text-gray-900">{cnt as number}</p>
                  </div>
                ))}
              </div>
            )}

            {detail.sections?.map((s: any) => (
              <div key={s.order} className="border-t border-gray-100 pt-4">
                <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{s.content}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
