import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { frameworksApi } from '@/api/client'
import { ChevronRight, ChevronDown, Plus, Download, Upload, RefreshCw, Trash2, Shield } from 'lucide-react'

function FrameworkRow({ fw, onSelect, selected }: { fw: any; onSelect: (id: string) => void; selected: boolean }) {
  const sourceBadge: Record<string, string> = {
    builtin: 'bg-indigo-100 text-indigo-700',
    custom: 'bg-green-100 text-green-700',
    api_sync: 'bg-orange-100 text-orange-700',
  }
  return (
    <div
      onClick={() => onSelect(fw.id)}
      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer border transition-colors
        ${selected ? 'border-brand bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}`}
    >
      <div className="flex items-center gap-3">
        <Shield size={18} className="text-brand" />
        <div>
          <p className="font-semibold text-gray-800">{fw.name}</p>
          <p className="text-xs text-gray-400">{fw.short_code} · v{fw.version}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${sourceBadge[fw.source] ?? 'bg-gray-100 text-gray-600'}`}>
        {fw.source}
      </span>
    </div>
  )
}

function ControlTree({ controls }: { controls: any[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const roots = controls.filter(c => !c.parent_id)
  const childrenOf = (id: string) => controls.filter(c => c.parent_id === id)

  function Node({ ctrl }: { ctrl: any }) {
    const kids = childrenOf(ctrl.id)
    const isOpen = open[ctrl.id]
    return (
      <div>
        <div
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer"
          onClick={() => setOpen(o => ({ ...o, [ctrl.id]: !isOpen }))}
        >
          {kids.length > 0
            ? (isOpen ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />)
            : <span className="w-[13px]" />
          }
          <span className="text-xs font-mono text-brand w-20 shrink-0">{ctrl.ref_code}</span>
          <span className="text-sm text-gray-800">{ctrl.title}</span>
        </div>
        {isOpen && kids.length > 0 && (
          <div className="ml-6 border-l border-gray-100 pl-2">
            {kids.map((k: any) => <Node key={k.id} ctrl={k} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {roots.map(c => <Node key={c.id} ctrl={c} />)}
    </div>
  )
}

export default function Frameworks() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', short_code: '', version: '1.0', description: '' })

  const { data: frameworks, isLoading } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then(r => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['framework', selected],
    queryFn: () => frameworksApi.get(selected!).then(r => r.data),
    enabled: !!selected,
  })

  const loadBuiltinsMut = useMutation({
    mutationFn: () => frameworksApi.loadBuiltins(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['frameworks'] }),
  })

  const createMut = useMutation({
    mutationFn: () => frameworksApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['frameworks'] }); setShowCreate(false) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => frameworksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['frameworks'] }); setSelected(null) },
  })

  const exportFw = async (id: string, code: string) => {
    const res = await frameworksApi.export(id)
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${code}.json`; a.click()
  }

  const importFw = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    await frameworksApi.importFile(file)
    qc.invalidateQueries({ queryKey: ['frameworks'] })
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control Frameworks</h1>
          <p className="text-gray-500 mt-1">Manage compliance frameworks and their controls</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadBuiltinsMut.mutate()}
            disabled={loadBuiltinsMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 font-medium"
          >
            <RefreshCw size={15} /> Load Built-ins
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 font-medium cursor-pointer">
            <Upload size={15} /> Import JSON
            <input type="file" accept=".json" className="hidden" onChange={importFw} />
          </label>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-brand text-white hover:bg-brand-light font-medium"
          >
            <Plus size={15} /> New Framework
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Create Custom Framework</h3>
          <div className="grid grid-cols-2 gap-4">
            {(['name', 'short_code', 'version'] as const).map(k => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-600 block mb-1 capitalize">{k.replace('_', ' ')}</label>
                <input
                  value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate()} disabled={createMut.isPending}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-light">
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Framework list */}
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-gray-400 py-4">Loading…</p>}
          {frameworks?.map((fw: any) => (
            <FrameworkRow key={fw.id} fw={fw} onSelect={setSelected} selected={selected === fw.id} />
          ))}
        </div>

        {/* Detail */}
        {detail && (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{detail.name}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{detail.description}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportFw(detail.id, detail.short_code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
                  <Download size={14} /> Export
                </button>
                {detail.source !== 'builtin' && (
                  <button onClick={() => { if (confirm('Delete this framework?')) deleteMut.mutate(detail.id) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">{detail.controls?.length ?? 0} controls</div>
            <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-lg p-3">
              <ControlTree controls={detail.controls ?? []} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
