import { useState } from "react";

import { apiClient } from "./client";

/**
 * Returns an `exportCsv(endpoint, filename, params?)` function and a loading flag.
 * The endpoint should be like "/risks/export-csv/" (no baseURL prefix).
 */
export function useExportCsv() {
  const [isExporting, setIsExporting] = useState(false);

  async function exportCsv(
    endpoint: string,
    filename: string,
    params?: Record<string, unknown>
  ) {
    setIsExporting(true);
    try {
      const response = await apiClient.get(endpoint, {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return { exportCsv, isExporting };
}
