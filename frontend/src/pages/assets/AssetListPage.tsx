import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import {
  useAssets,
  useDataAssets,
  useDataFlows,
  useAssetCategories,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  assetKeys,
  type Asset,
  type AssetStatus,
} from "@/api/assets";
import { useBusinessUnits } from "@/api/organizations";
import { CriticalityBadge } from "@/components/assets/CriticalityBadge";
import { ClassificationBadge } from "@/components/assets/ClassificationBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ImportModal } from "@/components/common/ImportModal";
import { BulkUploadSection } from "@/components/common/BulkUploadSection";
import { ModuleStatusRulesTab } from "@/components/common/ModuleStatusRulesTab";
import { ModuleReviewsTab } from "@/components/common/ModuleReviewsTab";
import { useContentTypes } from "@/api/automatedActions";
import { cn } from "@/utils/cn";

// ─── Asset Form Modal ─────────────────────────────────────────────────────────

const CIA_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const CIA_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function CIABadge({ value }: { value?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize",
        CIA_COLORS[value] ?? "bg-muted text-muted-foreground"
      )}
    >
      {value}
    </span>
  );
}

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  business_unit: z.string().optional(),
  criticality: z.coerce.number().min(1).max(5),
  confidentiality: z.enum(["low", "medium", "high", "critical"]),
  integrity: z.enum(["low", "medium", "high", "critical"]),
  availability: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["active", "inactive", "retired"]),
  notes: z.string().optional(),
});

type AssetForm = z.infer<typeof assetSchema>;

interface AssetFormModalProps {
  open: boolean;
  onClose: () => void;
  asset?: Asset;
}

function AssetFormModal({ open, onClose, asset }: AssetFormModalProps) {
  const { data: categoriesData } = useAssetCategories();
  const { data: businessUnitsData } = useBusinessUnits({ page_size: 200 });
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset(asset?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetForm>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: asset?.name ?? "",
      description: asset?.description ?? "",
      category: asset?.category ?? "",
      business_unit: asset?.business_unit ?? "",
      criticality: asset?.criticality ?? 3,
      confidentiality: asset?.confidentiality ?? "medium",
      integrity: asset?.integrity ?? "medium",
      availability: asset?.availability ?? "medium",
      status: (asset?.status as AssetStatus) ?? "active",
      notes: asset?.notes ?? "",
    },
  });

  const categoryOptions =
    categoriesData?.results?.map((c) => ({
      value: c.id,
      label: c.name,
    })) ?? [];

  const businessUnitOptions = [
    { value: "", label: "No Business Unit" },
    ...(businessUnitsData?.results ?? []).map((bu: { id: string; name: string }) => ({
      value: bu.id,
      label: bu.name,
    })),
  ];

  const onSubmit = (values: AssetForm) => {
    const payload = {
      ...values,
      category: values.category || null,
      business_unit: values.business_unit || null,
      criticality: values.criticality as 1 | 2 | 3 | 4 | 5,
    };

    if (asset) {
      updateAsset.mutate(payload, { onSuccess: () => { reset(); onClose(); } });
    } else {
      createAsset.mutate(payload, { onSuccess: () => { reset(); onClose(); } });
    }
  };

  if (!open) return null;

  const isPending = createAsset.isPending || updateAsset.isPending;
  const isError = createAsset.isError || updateAsset.isError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {asset ? "Edit Asset" : "New Asset"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <Input
            label="Asset Name"
            {...register("name")}
            error={errors.name?.message}
            placeholder="e.g. Customer Database"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              {...register("description")}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[{ value: "", label: "No Category" }, ...categoryOptions]}
              {...register("category")}
            />
            <Select
              label="Business Unit"
              options={businessUnitOptions}
              {...register("business_unit")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Criticality"
              options={[
                { value: "1", label: "1 – Very Low" },
                { value: "2", label: "2 – Low" },
                { value: "3", label: "3 – Medium" },
                { value: "4", label: "4 – High" },
                { value: "5", label: "5 – Critical" },
              ]}
              {...register("criticality")}
            />

            <Select
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "retired", label: "Retired" },
              ]}
              {...register("status")}
            />
          </div>

          {/* CIA Triad */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              CIA Impact Ratings
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Select
                label="Confidentiality"
                options={CIA_OPTIONS}
                {...register("confidentiality")}
              />
              <Select
                label="Integrity"
                options={CIA_OPTIONS}
                {...register("integrity")}
              />
              <Select
                label="Availability"
                options={CIA_OPTIONS}
                {...register("availability")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <Textarea
              {...register("notes")}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              {asset ? "Save Changes" : "Create Asset"}
            </Button>
          </div>

          {isError && (
            <p className="text-sm text-destructive">
              Failed to save asset. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "all" | "data_assets" | "data_flows" | "reviews" | "bulk_upload" | "status_rules";

// ─── All Assets Tab ───────────────────────────────────────────────────────────

interface AllAssetsTabProps {
  onEdit: (asset: Asset) => void;
}

function AllAssetsTab({ onEdit }: AllAssetsTabProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [criticalityFilter, setCriticalityFilter] = useState("");

  const { data: categoriesData } = useAssetCategories();
  const deleteAsset = useDeleteAsset();

  const params = {
    search: search || undefined,
    category: categoryFilter || undefined,
    status: (statusFilter as AssetStatus) || undefined,
    criticality: criticalityFilter ? Number(criticalityFilter) : undefined,
  };

  const { data, isLoading } = useAssets(params);
  const assets = data?.results ?? [];

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...(categoriesData?.results?.map((c) => ({
      value: c.id,
      label: c.name,
    })) ?? []),
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="retired">Retired</option>
        </select>

        <select
          value={criticalityFilter}
          onChange={(e) => setCriticalityFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All Criticalities</option>
          <option value="1">1 – Very Low</option>
          <option value="2">2 – Low</option>
          <option value="3">3 – Medium</option>
          <option value="4">4 – High</option>
          <option value="5">5 – Critical</option>
        </select>
      </div>

      {/* Table */}
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
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Owner
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Criticality
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  C
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  I
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  A
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Business Unit
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No assets found.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/20"
                    onClick={() => navigate(`/assets/${asset.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{asset.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {asset.category_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {asset.owner_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <CriticalityBadge
                        value={asset.criticality as 1 | 2 | 3 | 4 | 5}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CIABadge value={asset.confidentiality} />
                    </td>
                    <td className="px-4 py-3">
                      <CIABadge value={asset.integrity} />
                    </td>
                    <td className="px-4 py-3">
                      <CIABadge value={asset.availability} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={asset.status}>{asset.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {asset.business_unit_name ?? "—"}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(asset)}
                          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete asset "${asset.name}"?`
                              )
                            ) {
                              deleteAsset.mutate(asset.id);
                            }
                          }}
                          className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Upload Tab ──────────────────────────────────────────────────────────

const ASSET_COLUMNS = [
  { name: "name", description: "Asset name", required: "Yes" },
  { name: "description", description: "Brief description", required: "No" },
  { name: "criticality", description: "1 (lowest) to 5 (highest)", required: "No (default 3)" },
  { name: "status", description: "active | inactive | retired", required: "No (default active)" },
  { name: "confidentiality", description: "low | medium | high | critical", required: "No (default medium)" },
  { name: "integrity", description: "low | medium | high | critical", required: "No (default medium)" },
  { name: "availability", description: "low | medium | high | critical", required: "No (default medium)" },
  { name: "notes", description: "Additional notes", required: "No" },
];

function BulkUploadTab({ onSuccess }: { onSuccess: () => void }) {
  return (
    <BulkUploadSection
      endpoint="/assets/assets/import-csv/"
      entityName="Assets"
      columns={ASSET_COLUMNS}
      onSuccess={onSuccess}
    />
  );
}

// ─── Data Assets Tab ──────────────────────────────────────────────────────────

function DataAssetsTab() {
  const { data, isLoading } = useDataAssets();
  const dataAssets = data?.results ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Asset Name
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Classification
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Retention (days)
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Processing Purpose
            </th>
          </tr>
        </thead>
        <tbody>
          {dataAssets.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No data assets found.
              </td>
            </tr>
          ) : (
            dataAssets.map((da) => (
              <tr
                key={da.id}
                className="border-b transition-colors last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3 font-medium">
                  {da.asset_name ?? da.asset}
                </td>
                <td className="px-4 py-3">
                  <ClassificationBadge value={da.classification} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {da.retention_period_days ?? "—"}
                </td>
                <td className="max-w-xs px-4 py-3 text-muted-foreground">
                  <span className="line-clamp-2">
                    {da.processing_purpose || "—"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Data Flows Tab ───────────────────────────────────────────────────────────

function DataFlowsTab() {
  const { data, isLoading } = useDataFlows();
  const dataFlows = data?.results ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Name
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Source Asset
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Destination Asset
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Cross-Border
            </th>
          </tr>
        </thead>
        <tbody>
          {dataFlows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No data flows found.
              </td>
            </tr>
          ) : (
            dataFlows.map((df) => (
              <tr
                key={df.id}
                className="border-b transition-colors last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3 font-medium">{df.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {df.source_asset_name ?? df.source_asset}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {df.destination_asset_name ?? df.destination_asset}
                </td>
                <td className="px-4 py-3">
                  {df.is_cross_border ? (
                    <Badge variant="high">Cross-Border</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssetListPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showModal, setShowModal] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAsset(undefined);
  };

  const { data: contentTypes = [] } = useContentTypes();
  const assetContentTypeId = contentTypes.find((ct) => ct.label === "assets.asset")?.id;

  // Flat list of all assets for the Reviews tab object selector
  const { data: allAssetsData } = useAssets({ page_size: 500 });
  const assetObjects = (allAssetsData?.results ?? []).map((a) => ({ id: a.id, label: a.name }));

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All Assets" },
    { key: "data_assets", label: "Data Assets" },
    { key: "data_flows", label: "Data Flows" },
    { key: "reviews", label: "Reviews" },
    { key: "bulk_upload", label: "Bulk Upload" },
    { key: "status_rules", label: "Status Rules" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage organizational assets, data assets, and data flows.
          </p>
        </div>
        {activeTab === "all" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => { setEditingAsset(undefined); setShowModal(true); }}>
              <Plus className="h-4 w-4" />
              New Asset
            </Button>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "all" && <AllAssetsTab onEdit={handleEdit} />}
      {activeTab === "data_assets" && <DataAssetsTab />}
      {activeTab === "data_flows" && <DataFlowsTab />}
      {activeTab === "reviews" && (
        <ModuleReviewsTab contentTypeId={assetContentTypeId} moduleLabel="Asset" objects={assetObjects} />
      )}
      {activeTab === "bulk_upload" && (
        <BulkUploadTab
          onSuccess={() => queryClient.invalidateQueries({ queryKey: assetKeys.lists() })}
        />
      )}
      {activeTab === "status_rules" && (
        <ModuleStatusRulesTab contentTypeLabel="assets.asset" moduleLabel="Asset" />
      )}

      <AssetFormModal
        open={showModal}
        onClose={handleCloseModal}
        asset={editingAsset}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/assets/assets/import-csv/"
        entityName="Assets"
        templateColumns={["name", "criticality", "status", "asset_type", "description"]}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: assetKeys.lists() })}
      />
    </div>
  );
}
