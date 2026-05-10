import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { documentsApi } from '@/api/client'
import { Upload, FileText, RefreshCw, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react'

function ParseStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: React.ElementType }> = {
    done: { cls: 'bg-green-100 text-green-800', Icon: CheckCircle },
    processing: { cls: 'bg-blue-100 text-blue-800', Icon: RefreshCw },
    pending: { cls: 'bg-yellow-100 text-yellow-800', Icon: Clock },
    failed: { cls: 'bg-red-100 text-red-800', Icon: AlertCircle },
  }
  const { cls, Icon } = map[status] ?? { cls: 'bg-gray-100 text-gray-600', Icon: FileText }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      <Icon size={11} />
      {status}
    </span>
  )
}

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Documents() {
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then(r => r.data),
    refetchInterval: 5000,
  })

  const deleteMut = useMutation({
    mututionFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const reparseMut = useMutation({
    mutationFn: (id: string) => documentsApi.reparse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true)
    for (const file of files) {
      try {
        await documentsApi.upload(file)
      } catch (e) {
        console.error(e)
      }
    }
    setUploading(false)
    qc.invalidateQueries({ queryKey: ['documents'] })
  }, [qc])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 mt-1">Upload policies, audit reports, and compliance documents for AI analysis</p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-brand bg-blue-50' : 'border-gray-200 hover:border-brand hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <Upload size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="font-medium text-gray-700">
          {uploading ? 'Uploading…' : isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF · DOCX · XLSX · CSV · TXT · PNG · JPG (max {100}MB each)</p>
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Size</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Chunks</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Uploaded</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && !docs?.length && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No documents uploaded yet</td></tr>
            )}
            {docs?.map((doc: any) => (
              <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 flex items-center gap-2 font-medium text-gray-800">
                  <FileText size={15} className="text-gray-400 shrink-0" />
                  <span className="truncate max-w-xs">{doc.name}</span>
                </td>
                <td className="px-5 py-3 text-gray-500">{formatBytes(doc.file_size)}</td>
                <td className="px-5 py-3 text-gray-500">{doc.chunk_count}</td>
                <td className="px-5 py-3"><ParseStatusBadge status={doc.parse_status} /></td>
                <td className="px-5 py-3 text-gray-400 text-xs">{new Date(doc.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => reparseMut.mutate(doc.id)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand"
                      title="Re-parse"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this document?')) deleteMut.mutate(doc.id) }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
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
