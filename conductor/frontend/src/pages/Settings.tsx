import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ollamaApi } from '@/api/client'
import { CheckCircle, XCircle, Download, RefreshCw, Server } from 'lucide-react'

const DEFAULT_MODELS = ['llama3:8b', 'mistral:7b', 'codellama:7b', 'nomic-embed-text', 'llama3:70b', 'phi3:mini']

export default function Settings() {
  const [customModel, setCustomModel] = useState('')
  const [pulling, setPulling] = useState<string | null>(null)
  const [pullLog, setPullLog] = useState<string[]>([])

  const { data: health, refetch: recheckHealth } = useQuery({
    queryKey: ['ollama-health'],
    queryFn: () => ollamaApi.health().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: models, refetch: refetchModels } = useQuery({
    queryKey: ['ollama-models'],
    queryFn: () => ollamaApi.models().then(r => r.data),
  })

  const pullModel = async (model: string) => {
    setPulling(model)
    setPullLog([])
    try {
      const BASE = import.meta.env.VITE_API_URL || ''
      const es = new EventSource(`${BASE}/api/v1/ollama/models/pull`)
      // Use fetch + streaming for POST
      const response = await fetch(`${BASE}/api/v1/ollama/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      })
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data: '))
        lines.forEach(line => {
          try {
            const data = JSON.parse(line.replace('data: ', ''))
            if (data.status) setPullLog(l => [...l.slice(-20), data.status])
          } catch { }
        })
      }
      refetchModels()
    } catch (e) {
      setPullLog(l => [...l, `Error: ${e}`])
    } finally {
      setPulling(null)
    }
  }

  const loadedNames = new Set((models?.models ?? []).map((m: any) => m.name?.split(':')[0]))

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage local LLM models and system configuration</p>
      </div>

      {/* Ollama Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Server size={18} />Ollama Local LLM</h2>
          <button onClick={() => recheckHealth()} className="text-gray-400 hover:text-brand"><RefreshCw size={14} /></button>
        </div>
        <div className="flex items-center gap-3">
          {health?.healthy
            ? <CheckCircle size={20} className="text-green-500" />
            : <XCircle size={20} className="text-red-500" />
          }
          <div>
            <p className="font-medium text-gray-800">{health?.healthy ? 'Ollama is running' : 'Ollama is unavailable'}</p>
            <p className="text-xs text-gray-400">{health?.base_url}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 bg-gray-50 rounded p-3">
          All AI inference runs locally via Ollama. No data is sent to external AI providers.
          Models are stored on a persistent Docker volume.
        </p>
      </div>

      {/* Models */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Local Models</h2>

        {/* Loaded models */}
        {models?.models?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Installed</p>
            {models.models.map((m: any) => (
              <div key={m.name} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-400">
                    {m.size ? `${(m.size / 1024 / 1024 / 1024).toFixed(1)} GB` : ''}
                  </p>
                </div>
                <CheckCircle size={16} className="text-green-500" />
              </div>
            ))}
          </div>
        )}

        {/* Available to pull */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available to Pull</p>
          {DEFAULT_MODELS.map(model => (
            <div key={model} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{model}</p>
              <button
                onClick={() => pullModel(model)}
                disabled={pulling === model || loadedNames.has(model.split(':')[0])}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand text-white hover:bg-brand-light disabled:opacity-50"
              >
                <Download size={11} />
                {pulling === model ? 'Pulling…' : loadedNames.has(model.split(':')[0]) ? 'Installed' : 'Pull'}
              </button>
            </div>
          ))}
        </div>

        {/* Custom model */}
        <div className="flex gap-2">
          <input value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder="Custom model name (e.g. llama3:13b)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand" />
          <button onClick={() => { if (customModel) pullModel(customModel) }} disabled={!customModel || !!pulling}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-light">
            Pull
          </button>
        </div>

        {/* Pull log */}
        {pullLog.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
            {pullLog.map((line, i) => (
              <p key={i} className="text-xs text-green-400 font-mono">{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
