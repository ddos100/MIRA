import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { useRisk, useTreatmentPlans, useCreateTreatmentPlan } from "@/api/risks";
import type { Risk, RiskTreatmentPlan } from "@/types";
import RiskFormModal from "./RiskFormModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function ratingColor(rating: string) {
  switch (rating) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-400";
    default: return "bg-green-500";
  }
}

function ScoreMeter({ label, score, rating }: { label: string; score: number; rating: string }) {
  const pct = Math.min((score / 25) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{score}</span>
          <Badge variant={rating}>
            {rating.charAt(0).toUpperCase() + rating.slice(1)}
          </Badge>
        </div>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${ratingColor(rating)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Treatment Plan Form ──────────────────────────────────────────────────────

const treatmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]),
});

type TreatmentFormValues = z.infer<typeof treatmentSchema>;

const TREATMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

function TreatmentPlanFormModal({
  open,
  onClose,
  riskId,
}: {
  open: boolean;
  onClose: () => void;
  riskId: string;
}) {
  const createPlan = useCreateTreatmentPlan();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: { title: "", description: "", due_date: "", status: "pending" },
  });

  async function onSubmit(values: TreatmentFormValues) {
    await createPlan.mutateAsync({
      risk: riskId,
      title: values.title,
      description: values.description ?? "",
      due_date: values.due_date || null,
      status: values.status,
    } as Partial<RiskTreatmentPlan>);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Treatment Plan" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Plan Title"
          placeholder="e.g. Implement MFA"
          error={errors.title?.message}
          {...register("title")}
        />
        <Textarea
          label="Description"
          placeholder="Describe this treatment plan…"
          rows={3}
          error={errors.description?.message}
          {...register("description")}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date"
            type="date"
            error={errors.due_date?.message}
            {...register("due_date")}
          />
          <Select
            label="Status"
            options={TREATMENT_STATUS_OPTIONS}
            error={errors.status?.message}
            {...register("status")}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Add Plan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main detail page ─────────────────────────────────────────────────────────

export default function RiskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [treatmentOpen, setTreatmentOpen] = useState(false);

  const { data: risk, isLoading, isError } = useRisk(id ?? "");
  const { data: treatmentPlans, isLoading: plansLoading } = useTreatmentPlans(id ?? "");

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !risk) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Risk not found.</p>
        <Button variant="outline" onClick={() => navigate("/risks")}>
          Back to Risks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={risk.title}
        description={`Status: ${risk.status.replace(/_/g, " ")}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/risks")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Risk info */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                Description
              </p>
              <p className="text-sm text-foreground">{risk.description || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Category
                </p>
                <p className="text-sm text-foreground">
                  {risk.category_name ?? risk.category_detail?.name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Owner
                </p>
                <p className="text-sm text-foreground">
                  {risk.owner_name ?? risk.owner_detail?.full_name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Business Unit
                </p>
                <p className="text-sm text-foreground">{risk.business_unit || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Identified Date
                </p>
                <p className="text-sm text-foreground">
                  {risk.identified_date
                    ? new Date(risk.identified_date).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Review Date
                </p>
                <p className="text-sm text-foreground">
                  {risk.review_date
                    ? new Date(risk.review_date).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Treatment Type
                </p>
                <p className="text-sm text-foreground capitalize">
                  {risk.treatment_type ?? "—"}
                </p>
              </div>
            </div>
            {risk.notes && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Notes
                </p>
                <p className="text-sm text-foreground">{risk.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Scoring */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Inherent Risk
              </p>
              <ScoreMeter
                label={`Likelihood ${risk.inherent_likelihood} × Impact ${risk.inherent_impact}`}
                score={risk.inherent_score}
                rating={risk.inherent_rating}
              />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Residual Risk
              </p>
              <ScoreMeter
                label={`Likelihood ${risk.residual_likelihood} × Impact ${risk.residual_impact}`}
                score={risk.residual_score}
                rating={risk.residual_rating}
              />
            </div>
            <div className="rounded-md bg-muted/50 p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Reduction</span>
              <span className="text-sm font-semibold text-foreground">
                {risk.inherent_score - risk.residual_score > 0
                  ? `−${risk.inherent_score - risk.residual_score} points`
                  : "No reduction yet"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Treatment Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Treatment Plans</CardTitle>
            <Button size="sm" onClick={() => setTreatmentOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !treatmentPlans || treatmentPlans.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No treatment plans yet. Add one to start tracking remediation.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {treatmentPlans.map((plan) => (
                <div key={plan.id} className="flex items-start justify-between py-3 gap-4">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {plan.title}
                    </p>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                    {plan.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(plan.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant={plan.status}>
                    {plan.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {editOpen && (
        <RiskFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          risk={risk as Risk}
        />
      )}

      <TreatmentPlanFormModal
        open={treatmentOpen}
        onClose={() => setTreatmentOpen(false)}
        riskId={id ?? ""}
      />
    </div>
  );
}
