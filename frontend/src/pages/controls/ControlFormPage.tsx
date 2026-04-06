import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useControl, useCreateControl, useUpdateControl, useControlCategories } from "@/api/controls";
import { useRisks } from "@/api/risks";
import { usePolicies } from "@/api/policies";
import { useRequirements } from "@/api/compliance";
import { useBusinessUnits } from "@/api/organizations";
import { useUsers } from "@/api/auth";
import type { Control } from "@/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  control_type: z.enum(["preventive", "detective", "corrective", "directive"]),
  frequency: z.enum(["continuous", "daily", "weekly", "monthly", "quarterly", "annually"]),
  status: z.enum(["active", "inactive", "under_review"]),
  owner: z.string().optional(),
  category: z.string().optional(),
  business_unit: z.string().optional(),
  version: z.string().optional(),
  last_review_date: z.string().optional(),
  next_review_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Option constants ─────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "preventive", label: "Preventive" },
  { value: "detective", label: "Detective" },
  { value: "corrective", label: "Corrective" },
  { value: "directive", label: "Directive" },
];

const FREQUENCY_OPTIONS = [
  { value: "continuous", label: "Continuous" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "under_review", label: "Under Review" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ControlFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id !== undefined && id !== "new";

  // M2M state
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [selectedCompliance, setSelectedCompliance] = useState<string[]>([]);

  // Reference data
  const { data: existingControl } = useControl(isEditing ? id! : "");
  const { data: categories } = useControlCategories();
  const { data: businessUnitsData } = useBusinessUnits({ page_size: 200 });
  const { data: usersData } = useUsers({ page_size: 200 });
  const { data: risksData } = useRisks({ page_size: 200 });
  const { data: policiesData } = usePolicies({ page_size: 200 });
  const { data: requirementsData } = useRequirements({ page_size: 500 });

  const businessUnits = businessUnitsData?.results ?? [];
  const users = usersData?.results ?? [];
  const risks = risksData?.results ?? [];
  const policies = policiesData?.results ?? [];
  const requirements = requirementsData?.results ?? [];

  const categoryOptions = [
    { value: "", label: "No category" },
    ...(categories ?? []).map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })),
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
  const riskOptions = risks.map((r: { id: string; title: string }) => ({ value: r.id, label: r.title }));
  const policyOptions = policies.map((p: { id: string; title: string }) => ({ value: p.id, label: p.title }));
  const requirementOptions = requirements.map(
    (r: { id: string; ref_code: string; title: string }) => ({
      value: r.id,
      label: `${r.ref_code} — ${r.title}`,
    })
  );

  const createControl = useCreateControl();
  const updateControl = useUpdateControl(id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      control_type: "preventive",
      frequency: "monthly",
      status: "active",
      owner: "",
      category: "",
      business_unit: "",
      version: "1.0",
      last_review_date: "",
      next_review_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (isEditing && existingControl) {
      const c = existingControl as Control;
      reset({
        title: c.title ?? "",
        description: c.description ?? "",
        control_type: c.control_type,
        frequency: c.frequency,
        status: c.status,
        owner: c.owner ?? "",
        category: c.category ?? "",
        business_unit: c.business_unit ?? "",
        version: c.version ?? "1.0",
        last_review_date: c.last_review_date ?? "",
        next_review_date: c.next_review_date ?? "",
        notes: c.notes ?? "",
      });
      setSelectedRisks(c.risks ?? []);
      setSelectedPolicies([]);
      setSelectedCompliance(c.compliance_requirements ?? []);
    }
  }, [isEditing, existingControl, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      owner: values.owner || null,
      category: values.category || null,
      business_unit: values.business_unit || null,
      last_review_date: values.last_review_date || null,
      next_review_date: values.next_review_date || null,
      risks: selectedRisks,
      compliance_requirements: selectedCompliance,
    };

    if (isEditing) {
      await updateControl.mutateAsync(payload);
    } else {
      await createControl.mutateAsync(payload);
    }
    navigate("/controls");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/controls")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? "Edit Control" : "New Control"}</h1>
          <p className="text-muted-foreground text-sm">
            {isEditing ? "Update control details and mappings." : "Define a new internal control."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h2>

          <Input
            label="Title"
            placeholder="Control title"
            error={errors.title?.message}
            {...register("title")}
          />

          <Textarea
            label="Description"
            placeholder="Describe what this control does…"
            error={errors.description?.message}
            rows={3}
            {...register("description")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Control Type"
              options={TYPE_OPTIONS}
              error={errors.control_type?.message}
              {...register("control_type")}
            />
            <Select
              label="Frequency"
              options={FREQUENCY_OPTIONS}
              error={errors.frequency?.message}
              {...register("frequency")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              error={errors.status?.message}
              {...register("status")}
            />
            <Input
              label="Version"
              placeholder="1.0"
              error={errors.version?.message}
              {...register("version")}
            />
          </div>
        </div>

        {/* Ownership */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ownership</h2>

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

          <Select
            label="Category"
            options={categoryOptions}
            error={errors.category?.message}
            {...register("category")}
          />
        </div>

        {/* Mappings */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mappings</h2>

          <MultiSelect
            label="Risks"
            options={riskOptions}
            value={selectedRisks}
            onChange={setSelectedRisks}
            placeholder="Link risks…"
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
        </div>

        {/* Review dates */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Review Schedule</h2>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Last Review Date"
              type="date"
              error={errors.last_review_date?.message}
              {...register("last_review_date")}
            />
            <Input
              label="Next Review Date"
              type="date"
              error={errors.next_review_date?.message}
              {...register("next_review_date")}
            />
          </div>

          <Textarea
            label="Notes"
            placeholder="Additional notes…"
            rows={2}
            error={errors.notes?.message}
            {...register("notes")}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/controls")}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? "Save Changes" : "Create Control"}
          </Button>
        </div>
      </form>
    </div>
  );
}
