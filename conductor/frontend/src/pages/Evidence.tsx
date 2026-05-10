import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { evidenceApi } from '@/api/client'
import { Upload, CheckCircle, XCircle, Clock, ShieldCheck, Trash2, Download } from 'lucide-react'

function HashBadge({ valid }: { valid?: boolean | null }) {
  if (valid === null || valid === undefined) return <span className="text-gray-300 text-xs">—</span>
  return valid
    ? <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle size={11} />Valid</span>
    : <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle size={11} />Mismatch</span>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    needs_review: 'bg-orange-100 text-orange-800',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

export default function Evidence() {
  const qc = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const { data: items, isLoading } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => evidenceApi.list({ limit: '100' }).then(r => r.data),
  })

  const verifyMut = useMutation({
    mutationFn: (id: string) => evidenceApi.verify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => evidenceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence'] }),
  })

  const uploadMut = useMutation({
    mutationFn: () => evidenceApi.upload(form.title, form.description, pendingFile!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evidence'] }); setShowUpload(false); setPendingFile(null) },
  })

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) { setPendingFile(files[0]); setShowUpload(true) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evidence</h1>
          <p className="text-gray-500 mt-1">Manage compliance evidence with SHA-256 integrity verification</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-light">
          <Upload size={15} /> Upload Evidence
        </button>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-brand bg-blue-50' : 'border-gray-200 hover:border-brand'}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-500">{isDragActive ? 'Drop evidence file here' : 'Drop any evidence file here to upload'}</p>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Upload Evidence</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand" />
              </div>
              {pendingFile && <p className="text-xs text-gray-500">File: {pendingFile.name} ({(pendingFile.size / 1024).toFixed(1)} KB)</p>}
              {!pendingFile && (
                <label className="flex items-center gap-2 text-sm text-brand cursor-pointer">
                  <Upload size={14} /> Select file
                  <input type="file" className="hidden" onChange={e => e.target.files?.[0] && setPendingFile(e.target.files[0])} />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => uploadMut.mutate()} disabled={!form.title || !pendingFile || uploadMut.isPending}
                className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-light">
                Upload
              </button>
              <button onClick={() => { setShowUpload(false); setPendingFile(null) }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Title</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Source</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Hash</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Collected</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && !items?.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No evidence items yet</td></tr>}
            {items?.map((ev: any) => (
              <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800 max-w-xs truncate">{ev.title}</td>
                <td className="px-5 py-3 text-gray-500 capitalize">{ev.source_type}</td>
                <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                <td className="px-5 py-3"><HashBadge valid={ev.hash_valid} /></td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {ev.collected_at ? new Date(ev.collected_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => verifyMut.mutate(ev.id)} title="Verify hash"
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600">
                      <ShieldCheck size={14} />
                    </button>
                    {ev.file_name && (
                      <a href={evidenceApi.downloadUrl(ev.id)} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand">
                        <Download size={14} />
                      </a>
                    )}
                    <button onClick={() => { if (confirm('Delete this evidence?')) deleteMut.mutate(ev.id) }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
