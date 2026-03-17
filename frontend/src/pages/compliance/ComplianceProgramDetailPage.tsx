import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  useProgram,
  useProgramGapSummary,
  useAssessments,
  useUpdateAssessment,
  type ComplianceAssessment,
  type AssessmentStatus,
} from "@/api/compliance";
import { AssessmentStatusSelect } from "@/components/compliance/AssessmentStatusSelect";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "not_assessed", label: "Not Assessed" },
  { value: "compliant", label: "Compliant" },
  { value: "partially_compliant", label: "Partially Compliant" },
  { value: "non_compliant", label: "Non-Compliant" },
  { value: "not_applicable", label: "Not Applicable" },
];

const PIE_COLORS: Record<string, string> = {
  compliant: "#22c55e",
  partially_compliant: "#eab308",
  non_compliant: "#ef4444",
  not_assessed: "#9ca3af",
  not_applicable: "#d1d5db",
};

// ─── Assessment Detail Modal ──────────────────────────────────────────────────

const assessmentSchema = z.object({
  notes: z.string().optional(),
  status: z.enum([
    "not_assessed",
    "compliant",
    "partially_compliant",
    "non_compliant",
    "not_applicable",
  ]),
});

type AssessmentForm = z.infer<typeof assessmentSchema>;

interface AssessmentDetailModalProps {
  assessment: ComplianceAssessment;
  onClose: () => void;
}

function AssessmentDetailModal({
  assessment,
  onClose,
}: AssessmentDetailModalProps) {
  const updateAssessment = useUpdateAssessment(assessment.id);
  const { register, handleSubmit } = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      notes: assessment.notes,
      status: assessment.status,
    },
  });

  const onSubmit = (values: AssessmentForm) => {
    updateAssessment.mutate(values, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {assessment.requirement_ref_code}
            </p>
            <h2 className="text-base font-semibold">
              {assessment.requirement_title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Status</label>
            <select
              {...register("status")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="not_assessed">Not Assessed</option>
              <option value="compliant">Compliant</option>
              <option value="partially_compliant">Partially Compliant</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="not_applicable">Not Applicable</option>
            </select>
          </div>

          <Textarea
            label="Notes / Evidence"
            {...register("notes")}
            rows={5}
            placeholder="Document your assessment findings, evidence, or remediation notes..."
          />

          {assessment.assessor_name && (
            <p className="text-xs text-muted-foreground">
              Assessor: {assessment.assessor_name}
            </p>
          )}
          {assessment.assessment_date && (
            <p className="text-xs text-muted-foreground">
              Last assessed:{" "}
              {new Date(assessment.assessment_date).toLocaleDateString()}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateAssessment.isPending}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Gap Summary Donut Chart ──────────────────────────────────────────────────

function GapSummaryCard({ programId }: { programId: string }) {
  const { data: gapSummary, isLoading } = useProgramGapSummary(programId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gap Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!gapSummary) return null;

  const pieData = [
    {
      name: "Compliant",
      value: gapSummary.by_status.compliant,
      key: "compliant",
    },
    {
      name: "Partially Compliant",
      value: gapSummary.by_status.partially_compliant,
      key: "partially_compliant",
    },
    {
      name: "Non-Compliant",
      value: gapSummary.by_status.non_compliant,
      key: "non_compliant",
    },
    {
      name: "Not Assessed",
      value: gapSummary.by_status.not_assessed,
      key: "not_assessed",
    },
    {
      name: "Not Applicable",
      value: gapSummary.by_status.not_applicable,
      key: "not_applicable",
    },
  ].filter((d) => d.value > 0);

  const total = gapSummary.total;
  const compliant = gapSummary.by_status.compliant;
  const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gap Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <div className="relative h-48 w-full max-w-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={PIE_COLORS[entry.key] ?? "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{pct}%</span>
              <span className="text-xs text-muted-foreground">Compliant</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            {[
              {
                key: "compliant",
                label: "Compliant",
                count: gapSummary.by_status.compliant,
              },
              {
                key: "partially_compliant",
                label: "Partially Compliant",
                count: gapSummary.by_status.partially_compliant,
              },
              {
                key: "non_compliant",
                label: "Non-Compliant",
                count: gapSummary.by_status.non_compliant,
              },
              {
                key: "not_assessed",
                label: "Not Assessed",
                count: gapSummary.by_status.not_assessed,
              },
              {
                key: "not_applicable",
                label: "Not Applicable",
                count: gapSummary.by_status.not_applicable,
              },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[item.key] }}
                />
                <span className="text-muted-foreground">{item.label}:</span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
            <div className="mt-1 border-t pt-1 font-medium">
              Total: {total}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Assessment Table ─────────────────────────────────────────────────────────

interface AssessmentTableProps {
  programId: string;
}

function AssessmentTable({ programId }: AssessmentTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedAssessment, setSelectedAssessment] =
    useState<ComplianceAssessment | null>(null);

  const params: Record<string, unknown> = { program: programId };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useAssessments(params);
  const assessments = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Requirements Assessment</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
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
                  Assessor
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {assessments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No assessments found
                    {statusFilter ? " for the selected status" : ""}.
                  </td>
                </tr>
              ) : (
                assessments.map((assessment) => (
                  <tr
                    key={assessment.id}
                    className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/20"
                    onClick={() => setSelectedAssessment(assessment)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {assessment.requirement_ref_code ?? "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <span className="line-clamp-2">
                        {assessment.requirement_title ?? "—"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <AssessmentStatusSelect
                        assessmentId={assessment.id}
                        currentStatus={assessment.status as AssessmentStatus}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {assessment.assessor_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {assessment.assessment_date
                        ? new Date(
                            assessment.assessment_date
                          ).toLocaleDateString()
                        : "—"}
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
      )}

      {selectedAssessment && (
        <AssessmentDetailModal
          assessment={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplianceProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: program, isLoading, isError } = useProgram(id ?? "");

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !program) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load program.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/compliance")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{program.name}</h1>
            {program.framework_name && (
              <Badge variant="outline">{program.framework_name}</Badge>
            )}
            <Badge variant={program.status}>
              {program.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Summary row */}
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {program.owner_name && (
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{program.owner_name}</span>
              </div>
            )}
            {program.target_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Target: {new Date(program.target_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {program.description && (
              <span className="max-w-lg truncate">{program.description}</span>
            )}
          </div>
        </div>
      </div>

      {/* Gap Summary */}
      <GapSummaryCard programId={program.id} />

      {/* Assessment Table */}
      <AssessmentTable programId={program.id} />
    </div>
  );
}
