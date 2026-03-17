import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useAssets,
  useDataAssets,
  useDataFlows,
  useAssetCategories,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  type Asset,
  type AssetStatus,
} from "@/api/assets";
import { CriticalityBadge } from "@/components/assets/CriticalityBadge";
import { ClassificationBadge } from "@/components/assets/ClassificationBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

// ─── Asset Form Modal ─────────────────────────────────────────────────────────

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  criticality: z.coerce.number().min(1).max(5),
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
      criticality: asset?.criticality ?? 3,
      status: (asset?.status as AssetStatus) ?? "active",
      notes: asset?.notes ?? "",
    },
  });

  const categoryOptions =
    categoriesData?.results?.map((c) => ({
      value: c.id,
      label: c.name,
    })) ?? [];

  const onSubmit = (values: AssetForm) => {
    const payload = {
      ...values,
      category: values.category || null,
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

          <Select
            label="Category"
            options={[{ value: "", label: "No Category" }, ...categoryOptions]}
            {...register("category")}
          />

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

type Tab = "all" | "data_assets" | "data_flows";

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
                    colSpan={7}
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
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAsset(undefined);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All Assets" },
    { key: "data_assets", label: "Data Assets" },
    { key: "data_flows", label: "Data Flows" },
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
          <Button onClick={() => { setEditingAsset(undefined); setShowModal(true); }}>
            <Plus className="h-4 w-4" />
            New Asset
          </Button>
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

      <AssetFormModal
        open={showModal}
        onClose={handleCloseModal}
        asset={editingAsset}
      />
    </div>
  );
}
