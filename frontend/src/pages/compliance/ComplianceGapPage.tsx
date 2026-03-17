import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import {
  usePrograms,
  useAssessments,
  useProgramGapSummary,
} from "@/api/compliance";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const STATUS_COLORS: Record<string, string> = {
  compliant: "#22c55e",
  partially_compliant: "#eab308",
  non_compliant: "#ef4444",
  not_assessed: "#9ca3af",
  not_applicable: "#d1d5db",
};

const STATUS_LABELS: Record<string, string> = {
  compliant: "Compliant",
  partially_compliant: "Partially",
  non_compliant: "Non-Compliant",
  not_assessed: "Not Assessed",
  not_applicable: "N/A",
};

// ─── Bar Chart card ───────────────────────────────────────────────────────────

function GapBarChart({ programId }: { programId: string }) {
  const { data: gapSummary, isLoading } = useProgramGapSummary(programId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!gapSummary) return null;

  const chartData = [
    { status: "compliant", count: gapSummary.by_status.compliant },
    {
      status: "partially_compliant",
      count: gapSummary.by_status.partially_compliant,
    },
    { status: "non_compliant", count: gapSummary.by_status.non_compliant },
    { status: "not_assessed", count: gapSummary.by_status.not_assessed },
    { status: "not_applicable", count: gapSummary.by_status.not_applicable },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="status"
              tickFormatter={(v) => STATUS_LABELS[v] ?? v}
              tick={{ fontSize: 11 }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                value,
                STATUS_LABELS[name] ?? name,
              ]}
              labelFormatter={(label) => STATUS_LABELS[label] ?? label}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Gap requirements table ───────────────────────────────────────────────────

function GapRequirementsTable({ programId }: { programId: string }) {
  const { data: programsData } = usePrograms();
  const programs = programsData?.results ?? [];

  const { data, isLoading } = useAssessments({
    program: programId,
    page_size: 500,
  });

  const gapItems =
    data?.results?.filter(
      (a) =>
        a.status === "non_compliant" || a.status === "partially_compliant"
    ) ?? [];

  const programName = programs.find((p) => p.id === programId)?.name;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">
        Gaps requiring attention
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({gapItems.length} item{gapItems.length !== 1 ? "s" : ""})
        </span>
      </h2>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Program
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Ref Code
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Title
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {gapItems.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No gaps found for the selected program.
                </td>
              </tr>
            ) : (
              gapItems.map((assessment) => (
                <tr
                  key={assessment.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {programName ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {assessment.requirement_ref_code ?? "—"}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="line-clamp-2">
                      {assessment.requirement_title ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={assessment.status}>
                      {assessment.status === "non_compliant"
                        ? "Non-Compliant"
                        : "Partially Compliant"}
                    </Badge>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-2">
                      {assessment.notes || "—"}
                    </span>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplianceGapPage() {
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const { data: programsData, isLoading: loadingPrograms } = usePrograms();
  const programs = programsData?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Gap Analysis</h1>
        <p className="text-sm text-muted-foreground">
          View compliance gaps and non-compliant requirements across programs.
        </p>
      </div>

      {/* Program Selector */}
      <div className="max-w-sm">
        {loadingPrograms ? (
          <LoadingSpinner size="sm" />
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">
              Select Program
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Choose a program —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Charts & table when program selected */}
      {selectedProgram && (
        <>
          <GapBarChart programId={selectedProgram} />
          <GapRequirementsTable programId={selectedProgram} />
        </>
      )}

      {!selectedProgram && !loadingPrograms && (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Select a program above to view its gap analysis.
        </div>
      )}
    </div>
  );
}
