import { useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { conductorApi, ConductorDocument } from "@/api/conductor";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const ACCEPTED_EXT = ".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp";

// ─── Status badge ───────────────────────────────────────────────────────────────

function ParseStatusBadge({ status }: { status: ConductorDocument["parse_status"] }) {
  switch (status) {
    case "done":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle size={12} />
          Done
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Loader2 size={12} className="animate-spin" />
          Processing
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle size={12} />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Clock size={12} />
          Pending
        </span>
      );
  }
}

// ─── Upload zone ─────────────────────────────────────────────────────────────────

function UploadZone({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      );
      if (files.length) onFilesSelected(files);
    },
    [onFilesSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFilesSelected(files);
    // reset so same file can be re-uploaded
    e.target.value = "";
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none ${
        dragOver
          ? "border-blue-400 bg-blue-50"
          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
      }`}
    >
      <UploadCloud
        className={`mx-auto mb-3 h-10 w-10 ${dragOver ? "text-blue-500" : "text-gray-300"}`}
      />
      <p className="text-sm font-medium text-gray-700">
        {dragOver ? "Drop files here" : "Drag & drop files or click to browse"}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        PDF, DOCX, XLSX, CSV, TXT, PNG, JPG accepted
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function ConductorDocuments() {
  const qc = useQueryClient();
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["conductor-documents"],
    queryFn: () => conductorApi.getDocuments().then((r) => r.data),
    refetchInterval: (query) => {
      const docs: ConductorDocument[] = (query.state.data as { results: ConductorDocument[] } | undefined)?.results ?? [];
      const anyProcessing = docs.some((d) => d.parse_status === "processing" || d.parse_status === "pending");
      return anyProcessing ? 3_000 : false;
    },
  });

  const documents: ConductorDocument[] = data?.results ?? [];

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      return conductorApi.uploadDocument(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conductor-documents"] });
    },
    onError: (err: unknown, file: File) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? `Failed to upload ${file.name}`;
      setUploadErrors((prev) => [...prev, msg]);
    },
  });

  const reparseMutation = useMutation({
    mutationFn: conductorApi.reparseDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-documents"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: conductorApi.deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-documents"] }),
  });

  const handleFilesSelected = (files: File[]) => {
    setUploadErrors([]);
    files.forEach((file) => uploadMutation.mutate(file));
  };

  const handleDelete = (doc: ConductorDocument) => {
    if (confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(doc.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 mt-0.5">
          Upload knowledge base documents for AI analysis
        </p>
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Upload Documents</h2>
        <UploadZone onFilesSelected={handleFilesSelected} />

        {uploadMutation.isPending && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
            <Loader2 size={14} className="animate-spin" />
            Uploading…
          </div>
        )}

        {uploadErrors.map((err, i) => (
          <p key={i} className="mt-2 text-sm text-red-600">
            {err}
          </p>
        ))}
      </div>

      {/* Document table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Documents{data?.count != null ? ` (${data.count})` : ""}
          </h2>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["conductor-documents"] })}
            className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Chunks</th>
                  <th className="px-6 py-3 font-medium">Pages</th>
                  <th className="px-6 py-3 font-medium">Size</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-blue-400 shrink-0" />
                        <span className="font-medium text-gray-800 truncate max-w-xs">
                          {doc.name || doc.file_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <ParseStatusBadge status={doc.parse_status} />
                    </td>
                    <td className="px-6 py-3 text-gray-600">{doc.chunk_count ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{doc.page_count ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{formatFileSize(doc.file_size)}</td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(doc.created_at)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => reparseMutation.mutate(doc.id)}
                          disabled={
                            reparseMutation.isPending &&
                            reparseMutation.variables === doc.id
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                          title="Reparse document"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={
                            deleteMutation.isPending &&
                            deleteMutation.variables === doc.id
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete document"
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
        )}
      </div>
    </div>
  );
}
