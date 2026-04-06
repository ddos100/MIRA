import { useRef, useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useImportCsv } from "@/api/useImportCsv";

interface Props {
  open: boolean;
  onClose: () => void;
  /** API endpoint path, e.g. "/risks/import-csv/" */
  endpoint: string;
  /** Human-readable entity name, e.g. "Risks" */
  entityName: string;
  /** Optional list of columns users can put in the CSV */
  templateColumns?: string[];
  /** Called after a successful import so the parent can refetch data */
  onSuccess?: () => void;
}

export function ImportModal({
  open,
  onClose,
  endpoint,
  entityName,
  templateColumns,
  onSuccess,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { importCsv, isImporting, result, error, reset } = useImportCsv();

  function handleClose() {
    setSelectedFile(null);
    reset();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    reset();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith(".csv")) {
      setSelectedFile(file);
      reset();
    }
  }

  async function handleImport() {
    if (!selectedFile) return;
    const res = await importCsv(endpoint, selectedFile);
    if (res && res.created > 0 && res.errors.length === 0) {
      onSuccess?.();
    }
  }

  function downloadTemplate() {
    if (!templateColumns?.length) return;
    const csv = templateColumns.join(",") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityName.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasResult = result !== null;
  const hasErrors = (result?.errors.length ?? 0) > 0;

  return (
    <Modal open={open} onClose={handleClose} title={`Import ${entityName}`} size="md">
      <div className="space-y-4">
        {/* Template download */}
        {templateColumns && templateColumns.length > 0 && (
          <div className="rounded-md bg-muted/40 px-4 py-3 text-sm flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              Need a template? Download a blank CSV with the correct headers.
            </span>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              Download Template
            </Button>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer
            ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/20"}
            ${selectedFile ? "border-primary/60 bg-primary/5" : ""}
          `}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <>
              <Upload className="h-8 w-8 text-primary mb-2" />
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(selectedFile.size / 1024).toFixed(1)} KB — Click to change
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drop a CSV file here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </>
          )}
        </div>

        {/* Result summary */}
        {hasResult && !hasErrors && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Successfully imported <strong>{result!.created}</strong>{" "}
              {entityName.toLowerCase()}.
            </span>
          </div>
        )}

        {(error || hasErrors) && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error || `Import completed with ${result?.errors.length} error(s)`}
            </div>
            {hasResult && result!.created > 0 && (
              <p className="text-xs text-muted-foreground">
                {result!.created} records were imported successfully.
              </p>
            )}
            {hasErrors && (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {result!.errors.slice(0, 20).map((e, i) => (
                  <li key={i} className="text-xs text-destructive/80">
                    Row {e.row}:{" "}
                    {e.error ??
                      Object.entries(e.errors ?? {})
                        .map(([f, msgs]) => `${f}: ${msgs.join(", ")}`)
                        .join("; ")}
                  </li>
                ))}
                {result!.errors.length > 20 && (
                  <li className="text-xs text-muted-foreground">
                    … and {result!.errors.length - 20} more errors.
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {hasResult && !hasErrors ? "Close" : "Cancel"}
          </Button>
          {!hasResult && (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
            >
              {isImporting ? "Importing…" : "Import"}
            </Button>
          )}
          {hasResult && (hasErrors || result!.created > 0) && (
            <Button
              variant="outline"
              onClick={() => { setSelectedFile(null); reset(); }}
            >
              Import Another File
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
