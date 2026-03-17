import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, Building2 } from "lucide-react";
import { format, addDays, isBefore } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  type Vendor,
  type VendorParams,
  type RiskTier,
  type VendorType,
} from "@/api/vendors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskTierVariant(tier: RiskTier): string {
  return { tier1: "critical", tier2: "high", tier3: "medium", tier4: "low" }[tier] ?? "default";
}

function riskTierLabel(tier: RiskTier): string {
  return { tier1: "Tier 1 – Critical", tier2: "Tier 2 – High", tier3: "Tier 3 – Medium", tier4: "Tier 4 – Low" }[tier] ?? tier;
}

function vendorTypeLabel(t: VendorType): string {
  return {
    supplier: "Supplier",
    partner: "Partner",
    contractor: "Contractor",
    cloud_provider: "Cloud Provider",
    subprocessor: "Subprocessor",
    other: "Other",
  }[t] ?? t;
}

function isExpiringSoon(contractEnd: string | null): boolean {
  if (!contractEnd) return false;
  return isBefore(new Date(contractEnd), addDays(new Date(), 90));
}

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  vendor_type: z.enum(["supplier", "partner", "contractor", "cloud_provider", "subprocessor", "other"]),
  risk_tier: z.enum(["tier1", "tier2", "tier3", "tier4"]),
  website: z.string().url("Must be a valid URL").or(z.literal("")),
  contact_name: z.string(),
  contact_email: z.string().email("Invalid email").or(z.literal("")),
  contact_phone: z.string(),
  contract_start: z.string().nullable(),
  contract_end: z.string().nullable(),
  is_active: z.boolean(),
  description: z.string(),
  services_provided: z.string(),
  data_shared: z.boolean(),
  processing_personal_data: z.boolean(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

// ─── Vendor Form Modal ─────────────────────────────────────────────────────────

interface VendorFormModalProps {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor;
}

function VendorFormModal({ open, onClose, vendor }: VendorFormModalProps) {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor(vendor?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendor
      ? {
          name: vendor.name,
          vendor_type: vendor.vendor_type,
          risk_tier: vendor.risk_tier,
          website: vendor.website ?? "",
          contact_name: vendor.contact_name ?? "",
          contact_email: vendor.contact_email ?? "",
          contact_phone: vendor.contact_phone ?? "",
          contract_start: vendor.contract_start ?? null,
          contract_end: vendor.contract_end ?? null,
          is_active: vendor.is_active,
          description: vendor.description ?? "",
          services_provided: vendor.services_provided ?? "",
          data_shared: vendor.data_shared ?? false,
          processing_personal_data: vendor.processing_personal_data ?? false,
        }
      : {
          name: "",
          vendor_type: "supplier",
          risk_tier: "tier3",
          website: "",
          contact_name: "",
          contact_email: "",
          contact_phone: "",
          contract_start: null,
          contract_end: null,
          is_active: true,
          description: "",
          services_provided: "",
          data_shared: false,
          processing_personal_data: false,
        },
  });

  const isEditing = !!vendor;
  const mutation = isEditing ? updateVendor : createVendor;

  function onSubmit(values: VendorFormValues) {
    mutation.mutate(values as Partial<Vendor>, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Vendor" : "New Vendor"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Name *" {...register("name")} error={errors.name?.message} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Vendor Type *</label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("vendor_type")}
            >
              {(["supplier","partner","contractor","cloud_provider","subprocessor","other"] as VendorType[]).map((t) => (
                <option key={t} value={t}>{vendorTypeLabel(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Risk Tier *</label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("risk_tier")}
            >
              {(["tier1","tier2","tier3","tier4"] as RiskTier[]).map((t) => (
                <option key={t} value={t}>{riskTierLabel(t)}</option>
              ))}
            </select>
          </div>
          <Input label="Contact Name" {...register("contact_name")} />
          <Input label="Contact Email" type="email" {...register("contact_email")} error={errors.contact_email?.message} />
          <Input label="Phone" {...register("contact_phone")} />
          <Input label="Website" {...register("website")} error={errors.website?.message} />
          <Input label="Contract Start" type="date" {...register("contract_start")} />
          <Input label="Contract End" type="date" {...register("contract_end")} />
        </div>

        <Textarea label="Description" rows={3} {...register("description")} />
        <Textarea label="Services Provided" rows={2} {...register("services_provided")} />

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("is_active")} className="rounded border-input" />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("data_shared")} className="rounded border-input" />
            Data Shared
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("processing_personal_data")} className="rounded border-input" />
            Processing Personal Data
          </label>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save vendor. Please try again.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Create Vendor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<VendorParams>({ page: 1, page_size: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Vendor | undefined>();

  const { data, isLoading, isError } = useVendors(params);
  const deleteVendor = useDeleteVendor();

  const vendors = data?.results ?? [];
  const total = data?.count ?? 0;

  // Stat cards
  const allVendors = useVendors({ page_size: 1000 });
  const allResults = allVendors.data?.results ?? [];
  const tier1Count = allResults.filter((v) => v.risk_tier === "tier1").length;
  const activeCount = allResults.filter((v) => v.is_active).length;
  const expiringCount = allResults.filter((v) => isExpiringSoon(v.contract_end)).length;

  function handleSearch(search: string) {
    setParams((p) => ({ ...p, search: search || undefined, page: 1 }));
  }

  function openCreate() {
    setEditVendor(undefined);
    setModalOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditVendor(v);
    setModalOpen(true);
  }

  function confirmDelete(v: Vendor) {
    setDeleteTarget(v);
  }

  function doDelete() {
    if (!deleteTarget) return;
    deleteVendor.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(undefined),
    });
  }

  const totalPages = Math.ceil(total / (params.page_size ?? 20));
  const currentPage = params.page ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Third-Party Registry</h1>
          <p className="text-sm text-muted-foreground">Manage vendor relationships and risk assessments.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Vendor
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Vendors", value: allVendors.data?.count ?? "—", color: "text-foreground" },
          { label: "Tier 1 (Critical)", value: tier1Count, color: "text-red-600" },
          { label: "Active", value: activeCount, color: "text-green-600" },
          { label: "Expiring in 90 Days", value: expiringCount, color: "text-orange-600" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{card.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search vendors..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-56"
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, vendor_type: (e.target.value as VendorType | ""), page: 1 }))}
        >
          <option value="">All Types</option>
          {(["supplier","partner","contractor","cloud_provider","subprocessor","other"] as VendorType[]).map((t) => (
            <option key={t} value={t}>{vendorTypeLabel(t)}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, risk_tier: (e.target.value as RiskTier | ""), page: 1 }))}
        >
          <option value="">All Tiers</option>
          {(["tier1","tier2","tier3","tier4"] as RiskTier[]).map((t) => (
            <option key={t} value={t}>{riskTierLabel(t)}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => {
            const val = e.target.value;
            setParams((p) => ({ ...p, is_active: val === "" ? "" : val === "true", page: 1 }));
          }}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load vendors.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Risk Tier</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contract End</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <Building2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No vendors found.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const expiringSoon = isExpiringSoon(v.contract_end);
                  return (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <button
                          onClick={() => navigate(`/vendors/${v.id}`)}
                          className="text-primary hover:underline text-left"
                        >
                          {v.name}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{vendorTypeLabel(v.vendor_type)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={riskTierVariant(v.risk_tier)}>{riskTierLabel(v.risk_tier)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.owner_detail?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {v.contract_end ? (
                          <span className={cn(expiringSoon && "text-orange-600 font-medium")}>
                            {format(new Date(v.contract_end), "MMM d, yyyy")}
                            {expiringSoon && " ⚠"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={v.is_active ? "active" : "inactive"}>
                          {v.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/vendors/${v.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete(v)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {vendors.length} of {total} vendors</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
            >
              Previous
            </Button>
            <span className="flex h-8 items-center px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <VendorFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditVendor(undefined); }} vendor={editVendor} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(undefined)}
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteVendor.isPending}
      />
    </div>
  );
}
