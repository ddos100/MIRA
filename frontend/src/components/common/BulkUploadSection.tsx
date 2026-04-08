import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/api/client";

interface ColumnRef {
  name: string;
  description: string;
  required: string;
}

interface BulkUploadSectionProps {
  endpoint: string;
  entityName: string;
  columns: ColumnRef[];
  onSuccess?: () => void;
}

export function BulkUploadSection({
  endpoint,
  entityName,
  columns,
  onSuccess,
}: BulkUploadSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created?: number; errors?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await apiClient.post(endpoint, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      setFile(null);
      onSuccess?.();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Upload failed. Check your CSV and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-base font-semibold mb-1">
          Bulk Import {entityName} via CSV
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a CSV file to create multiple {entityName.toLowerCase()} at once. Refer to
          the column reference below to format your file correctly.
        </p>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">Select CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
            className="block text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
          <div>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              isLoading={uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload & Import"}
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm dark:border-green-800 dark:bg-green-900/20">
            <p className="font-medium text-green-800 dark:text-green-300">
              Import complete — {result.created ?? 0} {entityName.toLowerCase()} created.
            </p>
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-red-700 dark:text-red-300 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h4 className="text-sm font-semibold mb-3">CSV Column Reference</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-medium text-muted-foreground w-40">
                Column
              </th>
              <th className="py-2 text-left font-medium text-muted-foreground">
                Description
              </th>
              <th className="py-2 text-left font-medium text-muted-foreground w-28">
                Required
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {columns.map((col) => (
              <tr key={col.name} className="hover:bg-muted/10">
                <td className="py-1.5 font-mono text-primary">{col.name}</td>
                <td className="py-1.5 text-muted-foreground">{col.description}</td>
                <td className="py-1.5 text-muted-foreground">{col.required}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
