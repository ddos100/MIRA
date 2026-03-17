import { useFrameworks, type ComplianceFramework } from "@/api/compliance";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ComplianceFrameworkListPage() {
  const { data, isLoading, isError } = useFrameworks();
  const frameworks: ComplianceFramework[] = data?.results ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load compliance frameworks.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Compliance Frameworks</h1>
        <p className="text-sm text-muted-foreground">
          Standards and regulations available for compliance programs.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Short Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Version
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Issuing Body
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Requirements
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {frameworks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No frameworks found.
                </td>
              </tr>
            ) : (
              frameworks.map((fw) => (
                <tr
                  key={fw.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-medium">{fw.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{fw.short_name}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fw.version || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fw.issuing_body || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    —
                  </td>
                  <td className="px-4 py-3">
                    {fw.is_active ? (
                      <Badge variant="active">Active</Badge>
                    ) : (
                      <Badge variant="inactive">Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
