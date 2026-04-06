import { useState } from "react";

import { apiClient } from "./client";

export interface ImportResult {
  created: number;
  errors: Array<{ row: number; error?: string; errors?: Record<string, string[]>; data: Record<string, unknown> }>;
  ids: string[];
}

/**
 * Returns an `importCsv(endpoint, file)` function, a loading flag, and the last result.
 * The endpoint should be like "/risks/import-csv/" (no baseURL prefix).
 */
export function useImportCsv() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importCsv(endpoint: string, file: File): Promise<ImportResult | null> {
    setIsImporting(true);
    setResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post<ImportResult>(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(response.data);
      return response.data;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Import failed. Please check the file and try again.";
      setError(msg);
      return null;
    } finally {
      setIsImporting(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return { importCsv, isImporting, result, error, reset };
}
