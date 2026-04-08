import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useCreateRisk, useUpdateRisk, useRiskCategories } from "@/api/risks";
import { useControls } from "@/api/controls";
import { usePolicies } from "@/api/policies";
import { useRequirements } from "@/api/compliance";
import { useBusinessUnits } from "@/api/organizations";
import { useUsers } from "@/api/auth";
import { useAssets } from "@/api/assets";
import type { Risk } from "@/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  owner: z.string().optional(),
  business_unit: z.string().optional(),
  status: z.enum(["open", "in_treatment", "accepted", "closed", "transferred"]),
  treatment_type: z.enum(["mitigate", "avoid", "transfer", "accept"]).optional().or(z.literal("")),
  inherent_likelihood: z.coerce.number().min(1).max(5),
  inherent_impact: z.coerce.number().min(1).max(5),
  residual_likelihood: z.coerce.number().min(1).max(5),
  residual_impact: z.coerce.number().min(1).max(5),
  identified_date: z.string().optional(),
  review_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Option lists ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_treatment", label: "In Treatment" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
  { value: "transferred", label: "Transferred" },
];

const TREATMENT_OPTIONS = [
  { value: "", label: "None" },
  { value: "mitigate", label: "Mitigate" },
  { value: "avoid", label: "Avoid" },
  { value: "transfer", label: "Transfer" },
  { value: "accept", label: "Accept" },
];

const SCALE_OPTIONS = [
  { value: "1", label: "1 — Very Low" },
  { value: "2", label: "2 — Low" },
  { value: "3", label: "3 — Medium" },
  { value: "4", label: "4 — High" },
  { value: "5", label: "5 — Very High" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface RiskFormModalProps {
  open: boolean;
  onClose: () => void;
  risk: Risk | null;
}

export default function RiskFormModal({ open, onClose, risk }: RiskFormModalProps) {
  const isEditing = !!risk;

  // M2M state (outside react-hook-form since MultiSelect uses controlled values)
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [selectedCompliance, setSelectedCompliance] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  // Reference data
  const { data: categories } = useRiskCategories();
  const { data: businessUnitsData } = useBusinessUnits({ page_size: 200 });
  const { data: usersData } = useUsers({ page_size: 200 });
  const { data: controlsData } = useControls({ page_size: 200 });
  const { data: policiesData } = usePolicies({ page_size: 200 });
  const { data: requirementsData } = useRequirements({ page_size: 500 });
  const { data: assetsData } = useAssets({ page_size: 200 });

  const businessUnits = businessUnitsData?.results ?? [];
  const users = usersData?.results ?? [];
  const controls = controlsData?.results ?? [];
  const policies = policiesData?.results ?? [];
  const requirements = requirementsData?.results ?? [];
  const assets = assetsData?.results ?? [];

  const categoryOptions = [
    { value: "", label: "No category" },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const ownerOptions = [
    { value: "", label: "No owner" },
    ...users.map((u: { id: string; display_name?: string; email: string }) => ({
      value: u.id,
      label: u.display_name || u.email,
    })),
  ];
  const buOptions = [
    { value: "", label: "No business unit" },
    ...businessUnits.map((bu: { id: string; name: string }) => ({ value: bu.id, label: bu.name })),
  ];
  const controlOptions = controls.map((c: { id: string; title: string }) => ({
    value: c.id,
    label: c.title,
  }));
  const policyOptions = policies.map((p: { id: string; title: string }) => ({
    value: p.id,
    label: p.title,
  }));
  const requirementOptions = requirements.map(
    (r: { id: string; ref_code: string; title: string }) => ({
      value: r.id,
      label: `${r.ref_code} — ${r.title}`,
    })
  );
  const assetOptions = assets.map((a: { id: string; name: string }) => ({
    value: a.id,
    label: a.name,
  }));

  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk(risk?.id ?? "");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      owner: "",
      business_unit: "",
      status: "open",
      treatment_type: "",
      inherent_likelihood: 1,
      inherent_impact: 1,
      residual_likelihood: 1,
      residual_impact: 1,
      identified_date: "",
      review_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (risk) {
      reset({
        title: risk.title ?? "",
        description: risk.description ?? "",
        category: risk.category ?? "",
        owner: risk.owner ?? "",
        business_unit: risk.business_unit ?? "",
        status: risk.status,
        treatment_type: risk.treatment_type ?? "",
        inherent_likelihood: risk.inherent_likelihood ?? 1,
        inherent_impact: risk.inherent_impact ?? 1,
        residual_likelihood: risk.residual_likelihood ?? 1,
        residual_impact: risk.residual_impact ?? 1,
        identified_date: risk.identified_date ?? "",
        review_date: risk.review_date ?? "",
        notes: risk.notes ?? "",
      });
      setSelectedControls(risk.controls ?? []);
      setSelectedPolicies(risk.policies ?? []);
      setSelectedCompliance(risk.compliance_requirements ?? []);
      setSelectedAssets(risk.assets ?? []);
    } else {
      reset({
        title: "",
        description: "",
        category: "",
        owner: "",
        business_unit: "",
        status: "open",
        treatment_type: "",
        inherent_likelihood: 1,
        inherent_impact: 1,
        residual_likelihood: 1,
        residual_impact: 1,
        identified_date: "",
        review_date: "",
        notes: "",
      });
      setSelectedControls([]);
      setSelectedPolicies([]);
      setSelectedCompliance([]);
      setSelectedAssets([]);
    }
  }, [risk, reset]);

  const inherentLikelihood = watch("inherent_likelihood");
  const inherentImpact = watch("inherent_impact");
  const residualLikelihood = watch("residual_likelihood");
  const residualImpact = watch("residual_impact");

  const inherentScore = Number(inherentLikelihood) * Number(inherentImpact);
  const residualScore = Number(residualLikelihood) * Number(residualImpact);

  async function onSubmit(values: FormValues) {
    const payload: Partial<Risk> = {
      ...values,
      category: values.category || null,
      owner: values.owner || null,
      business_unit: values.business_unit || null,
      treatment_type: (values.treatment_type as Risk["treatment_type"]) || null,
      identified_date: values.identified_date || null,
      review_date: values.review_date || null,
      controls: selectedControls,
      policies: selectedPolicies,
      compliance_requirements: selectedCompliance,
      assets: selectedAssets,
    };

    if (isEditing) {
      await updateRisk.mutateAsync(payload);
    } else {
      await createRisk.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Risk" : "New Risk"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <Input
          label="Title"
          placeholder="Brief risk title"
          error={errors.title?.message}
          {...register("title")}
        />

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="Describe the risk in detail…"
          error={errors.description?.message}
          rows={3}
          {...register("description")}
        />

        {/* Category + Status */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            options={categoryOptions}
            error={errors.category?.message}
            {...register("category")}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register("status")}
          />
        </div>

        {/* Owner + Business Unit */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Owner"
            options={ownerOptions}
            error={errors.owner?.message}
            {...register("owner")}
          />
          <Select
            label="Business Unit"
            options={buOptions}
            error={errors.business_unit?.message}
            {...register("business_unit")}
          />
        </div>

        {/* Treatment type */}
        <Select
          label="Treatment Type"
          options={TREATMENT_OPTIONS}
          error={errors.treatment_type?.message}
          {...register("treatment_type")}
        />

        {/* Inherent scoring */}
        <fieldset className="rounded-md border border-border p-4 space-y-3">
          <legend className="text-sm font-medium text-foreground px-1">Inherent Risk</legend>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Likelihood"
              options={SCALE_OPTIONS}
              error={errors.inherent_likelihood?.message}
              {...register("inherent_likelihood")}
            />
            <Select
              label="Impact"
              options={SCALE_OPTIONS}
              error={errors.inherent_impact?.message}
              {...register("inherent_impact")}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Inherent Score:{" "}
            <span className="font-semibold text-foreground">{inherentScore}</span>
          </p>
        </fieldset>

        {/* Residual scoring */}
        <fieldset className="rounded-md border border-border p-4 space-y-3">
          <legend className="text-sm font-medium text-foreground px-1">Residual Risk</legend>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Likelihood"
              options={SCALE_OPTIONS}
              error={errors.residual_likelihood?.message}
              {...register("residual_likelihood")}
            />
            <Select
              label="Impact"
              options={SCALE_OPTIONS}
              error={errors.residual_impact?.message}
              {...register("residual_impact")}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Residual Score:{" "}
            <span className="font-semibold text-foreground">{residualScore}</span>
          </p>
        </fieldset>

        {/* M2M mappings */}
        <fieldset className="rounded-md border border-border p-4 space-y-4">
          <legend className="text-sm font-medium text-foreground px-1">Mappings</legend>

          <MultiSelect
            label="Controls"
            options={controlOptions}
            value={selectedControls}
            onChange={setSelectedControls}
            placeholder="Link controls…"
          />

          <MultiSelect
            label="Policies"
            options={policyOptions}
            value={selectedPolicies}
            onChange={setSelectedPolicies}
            placeholder="Link policies…"
          />

          <MultiSelect
            label="Compliance Requirements"
            options={requirementOptions}
            value={selectedCompliance}
            onChange={setSelectedCompliance}
            placeholder="Link compliance requirements…"
          />

          <MultiSelect
            label="Assets"
            options={assetOptions}
            value={selectedAssets}
            onChange={setSelectedAssets}
            placeholder="Link affected assets…"
          />
        </fieldset>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Identified Date"
            type="date"
            error={errors.identified_date?.message}
            {...register("identified_date")}
          />
          <Input
            label="Review Date"
            type="date"
            error={errors.review_date?.message}
            {...register("review_date")}
          />
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          placeholder="Additional notes…"
          rows={2}
          error={errors.notes?.message}
          {...register("notes")}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? "Save Changes" : "Create Risk"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
