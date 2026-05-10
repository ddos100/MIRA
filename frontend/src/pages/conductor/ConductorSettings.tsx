import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Download, RefreshCw, Server, XCircle } from "lucide-react";
import { conductorApi } from "@/api/conductor";

const DEFAULT_MODELS = ["llama3:8b", "mistral:7b", "codellama:7b", "nomic-embed-text", "llama3:70b", "phi3:mini"];

export default function ConductorSettings() {
  const [customModel, setCustomModel] = useState("");
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullLog, setPullLog] = useState<string[]>([]);

  const { data: healthData, refetch: recheckHealth } = useQuery({
    queryKey: ["conductor-ollama-health"],
    queryFn: () => conductorApi.getOllamaHealth().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: modelsData, refetch: refetchModels } = useQuery({
    queryKey: ["conductor-ollama-models"],
    queryFn: () => conductorApi.getOllamaModels().then((r) => r.data),
  });

  const pullModel = async (model: string) => {
    setPulling(model);
    setPullLog([]);
    try {
      const BASE = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${BASE}/api/v1/conductor/ollama/models/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}` },
        body: JSON.stringify({ model }),
      });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        text.split("\n").filter((l) => l.startsWith("data: ")).forEach((line) => {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            if (data.status) setPullLog((l) => [...l.slice(-30), data.status]);
          } catch {}
        });
      }
      await refetchModels();
    } catch (e) {
      setPullLog((l) => [...l, `Error: ${e}`]);
    } finally {
      setPulling(null);
    }
  };

  const installedNames = new Set((modelsData?.models ?? []).map((m: any) => m.name?.split(":")[0]));

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Settings</h1>
        <p className="text-gray-500 mt-1">Manage local Ollama LLM models for AI automation</p>
      </div>

      {/* Ollama Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Server className="h-4 w-4" /> Ollama Local LLM
          </h2>
          <button onClick={() => recheckHealth()} className="text-gray-400 hover:text-blue-600 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {healthData?.healthy ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <div>
            <p className="font-medium text-gray-800">{healthData?.healthy ? "Ollama is running" : "Ollama is unavailable"}</p>
            <p className="text-xs text-gray-400">{healthData?.base_url}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
          All AI inference runs locally via Ollama. No data is sent to external AI providers. Models are stored on a persistent Docker volume.
        </p>
      </div>

      {/* Installed Models */}
      {modelsData?.models?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Installed Models</h2>
          {modelsData.models.map((m: any) => (
            <div key={m.name} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <div>
                <p className="text-sm font-medium text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-400">{m.size ? `${(m.size / 1024 / 1024 / 1024).toFixed(1)} GB` : ""}</p>
              </div>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          ))}
        </div>
      )}

      {/* Pull Models */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Available to Pull</h2>
        <div className="space-y-2">
          {DEFAULT_MODELS.map((model) => {
            const installed = installedNames.has(model.split(":")[0]);
            return (
              <div key={model} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <p className="text-sm font-medium text-gray-700">{model}</p>
                <button
                  onClick={() => pullModel(model)}
                  disabled={!!pulling || installed}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  {pulling === model ? "Pulling…" : installed ? "Installed" : "Pull"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="Custom model (e.g. llama3:13b)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={() => { if (customModel) pullModel(customModel); }}
            disabled={!customModel || !!pulling}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Pull
          </button>
        </div>

        {pullLog.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto">
            {pullLog.map((line, i) => (
              <p key={i} className="text-xs text-green-400 font-mono">{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
