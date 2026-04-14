import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAssetCategories, useCreateAsset, useUpdateAsset,
  type Asset, type AssetStatus,
} from "@/api/assets";
import { useBusinessUnits } from "@/api/organizations";
import { useUsers } from "@/api/auth";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// ─── Schema ───────────────────────────────────────────────────────────────────

const CIA_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  owner: z.string().optional(),
  business_unit: z.string().optional(),
  criticality: z.coerce.number().min(1).max(5),
  confidentiality: z.enum(["low", "medium", "high", "critical"]),
  integrity: z.enum(["low", "medium", "high", "critical"]),
  availability: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["active", "inactive", "retired"]),
  asset_value: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type AssetForm = z.infer<typeof assetSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface AssetFormModalProps {
  open: boolean;
  onClose: () => void;
  asset?: Asset;
  onSuccess?: (asset: Asset) => void;
}

export function AssetFormModal({ open, onClose, asset, onSuccess }: AssetFormModalProps) {
  const { data: categoriesData } = useAssetCategories();
  const { data: businessUnitsData } = useBusinessUnits({ page_size: 200 });
  const { data: usersData } = useUsers({ page_size: 200 });
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset(asset?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AssetForm>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: asset?.name ?? "",
      description: asset?.description ?? "",
      category: asset?.category ?? "",
      owner: asset?.owner ?? "",
      business_unit: asset?.business_unit ?? "",
      criticality: asset?.criticality ?? 3,
      confidentiality: asset?.confidentiality ?? "medium",
      integrity: asset?.integrity ?? "medium",
      availability: asset?.availability ?? "medium",
      status: (asset?.status as AssetStatus) ?? "active",
      asset_value: asset?.asset_value ?? "",
      notes: asset?.notes ?? "",
      tags: asset?.tags?.join(", ") ?? "",
    },
  });

  // Reset when the target asset changes (e.g. switching from new to edit)
  useEffect(() => {
    reset({
      name: asset?.name ?? "",
      description: asset?.description ?? "",
      category: asset?.category ?? "",
      owner: asset?.owner ?? "",
      business_unit: asset?.business_unit ?? "",
      criticality: asset?.criticality ?? 3,
      confidentiality: asset?.confidentiality ?? "medium",
      integrity: asset?.integrity ?? "medium",
      availability: asset?.availability ?? "medium",
      status: (asset?.status as AssetStatus) ?? "active",
      asset_value: asset?.asset_value ?? "",
      notes: asset?.notes ?? "",
      tags: asset?.tags?.join(", ") ?? "",
    });
  }, [asset, reset]);

  const categoryOptions = [
    { value: "", label: "No Category" },
    ...(categoriesData?.results?.map((c) => ({ value: c.id, label: c.name })) ?? []),
  ];

  const businessUnitOptions = [
    { value: "", label: "No Business Unit" },
    ...(businessUnitsData?.results ?? []).map((bu: { id: string; name: string }) => ({
      value: bu.id, label: bu.name,
    })),
  ];

  const userOptions = [
    { value: "", label: "— No Owner —" },
    ...(usersData?.results ?? []).map((u: { id: string; first_name?: string; last_name?: string; email: string }) => ({
      value: u.id,
      label: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email,
    })),
  ];

  function onSubmit(values: AssetForm) {
    const payload = {
      ...values,
      category: values.category || null,
      owner: values.owner || null,
      business_unit: values.business_unit || null,
      criticality: values.criticality as 1 | 2 | 3 | 4 | 5,
      asset_value: values.asset_value || null,
      tags: values.tags ? values.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };

    const opts = {
      onSuccess: (data: Asset) => { reset(); onClose(); onSuccess?.(data); },
    };

    if (asset) {
      updateAsset.mutate(payload, opts);
    } else {
      createAsset.mutate(payload, opts);
    }
  }

  const isPending = createAsset.isPending || updateAsset.isPending;
  const isError = createAsset.isError || updateAsset.isError;

  return (
    <Modal open={open} onClose={onClose} title={asset ? "Edit Asset" : "New Asset"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Asset Name *" {...register("name")} error={errors.name?.message} placeholder="e.g. Customer Database" />

        <Textarea label="Description" {...register("description")} placeholder="Optional description" rows={2} />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Category" options={categoryOptions} {...register("category")} />
          <Select label="Business Unit" options={businessUnitOptions} {...register("business_unit")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Owner" options={userOptions} {...register("owner")} />
          <Input label="Asset Value ($)" type="number" {...register("asset_value")} placeholder="e.g. 50000" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Criticality" options={[
            { value: "1", label: "1 – Very Low" },
            { value: "2", label: "2 – Low" },
            { value: "3", label: "3 – Medium" },
            { value: "4", label: "4 – High" },
            { value: "5", label: "5 – Critical" },
          ]} {...register("criticality")} />
          <Select label="Status" options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "retired", label: "Retired" },
          ]} {...register("status")} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">CIA Impact Ratings</p>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Confidentiality" options={CIA_OPTIONS} {...register("confidentiality")} />
            <Select label="Integrity" options={CIA_OPTIONS} {...register("integrity")} />
            <Select label="Availability" options={CIA_OPTIONS} {...register("availability")} />
          </div>
        </div>

        <Input label="Tags" {...register("tags")} placeholder="Comma-separated: cloud, pii, gdpr" />

        <Textarea label="Notes" {...register("notes")} placeholder="Additional notes" rows={2} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isPending}>{asset ? "Save Changes" : "Create Asset"}</Button>
        </div>

        {isError && <p className="text-sm text-destructive">Failed to save asset. Please try again.</p>}
      </form>
    </Modal>
  );
}
