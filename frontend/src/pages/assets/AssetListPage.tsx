import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Upload, Settings2, Save, X, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import {
  useAssets,
  useDataFlows,
  useAssetCategories,
  useDeleteAsset,
  assetKeys,
  type Asset,
  type AssetStatus,
  type DataFlow,
} from "@/api/assets";
import { apiClient } from "@/api/client";
import { useBusinessUnits } from "@/api/organizations";
import { useUsers } from "@/api/auth";
import { CriticalityBadge } from "@/components/assets/CriticalityBadge";
import { AssetFormModal } from "@/components/assets/AssetFormModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ImportModal } from "@/components/common/ImportModal";
import { Modal } from "@/components/ui/Modal";
import { BulkUploadSection } from "@/components/common/BulkUploadSection";
import { ModuleStatusRulesTab } from "@/components/common/ModuleStatusRulesTab";
import { ModuleReviewsTab } from "@/components/common/ModuleReviewsTab";
import { useContentTypes } from "@/api/automatedActions";
import { cn } from "@/utils/cn";

// ─── CIA Badge ────────────────────────────────────────────────────────────────

const CIA_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function CIABadge({ value }: { value?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize", CIA_COLORS[value] ?? "bg-muted text-muted-foreground")}>
      {value}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "all" | "data_assets" | "data_flows" | "reviews" | "bulk_upload" | "status_rules";

// ─── Column & Filter Presets helpers ─────────────────────────────────────────

const ALL_COLUMNS = [
  { key: "name",            label: "Name" },
  { key: "description",     label: "Description" },
  { key: "category",        label: "Category" },
  { key: "owner",           label: "Owner" },
  { key: "business_unit",   label: "Business Unit" },
  { key: "criticality",     label: "Criticality" },
  { key: "confidentiality", label: "Confidentiality (C)" },
  { key: "integrity",       label: "Integrity (I)" },
  { key: "availability",    label: "Availability (A)" },
  { key: "status",          label: "Status" },
  { key: "asset_value",     label: "Asset Value" },
  { key: "tags",            label: "Tags" },
  { key: "notes",           label: "Notes" },
  { key: "created_at",      label: "Created" },
  { key: "updated_at",      label: "Updated" },
] as const;
type ColKey = typeof ALL_COLUMNS[number]["key"];

const DEFAULT_VISIBLE: ColKey[] = ["name","category","owner","criticality","confidentiality","integrity","availability","status","business_unit"];

const LS_COLS_KEY = "mira_asset_visible_cols";
const LS_PRESETS_KEY = "mira_asset_filter_presets";

interface FilterState { search: string; category: string; status: string; criticality: string; owner: string; business_unit: string; }
interface FilterPreset { name: string; filters: FilterState; }

function loadVisibleCols(): ColKey[] {
  try {
    const v = localStorage.getItem(LS_COLS_KEY);
    return v ? JSON.parse(v) : DEFAULT_VISIBLE;
  } catch { return DEFAULT_VISIBLE; }
}

function loadPresets(): FilterPreset[] {
  try {
    const v = localStorage.getItem(LS_PRESETS_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

// ─── All Assets Tab ───────────────────────────────────────────────────────────

function AllAssetsTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [criticalityFilter, setCriticalityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [businessUnitFilter, setBusinessUnitFilter] = useState("");
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(loadVisibleCols);
  const [showColPicker, setShowColPicker] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets);
  const [presetName, setPresetName] = useState("");
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | undefined>();
  const [editOpen, setEditOpen] = useState(false);

  const { data: categoriesData } = useAssetCategories();
  const { data: businessUnitsData } = useBusinessUnits({ page_size: 200 });
  const { data: usersData } = useUsers({ page_size: 200 });
  const deleteAsset = useDeleteAsset();

  const params = useMemo(() => ({
    search: search || undefined,
    category: categoryFilter || undefined,
    status: (statusFilter as AssetStatus) || undefined,
    criticality: criticalityFilter ? Number(criticalityFilter) : undefined,
    owner: ownerFilter || undefined,
    business_unit: businessUnitFilter || undefined,
  }), [search, categoryFilter, statusFilter, criticalityFilter, ownerFilter, businessUnitFilter]);

  const { data, isLoading } = useAssets(params);
  const assets = data?.results ?? [];

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...(categoriesData?.results?.map((c) => ({ value: c.id, label: c.name })) ?? []),
  ];
  const buOptions = [
    { value: "", label: "All Business Units" },
    ...(businessUnitsData?.results ?? []).map((bu: { id: string; name: string }) => ({ value: bu.id, label: bu.name })),
  ];
  const ownerOptions = [
    { value: "", label: "All Owners" },
    ...(usersData?.results ?? []).map((u: { id: string; first_name?: string; last_name?: string; email: string }) => ({
      value: u.id,
      label: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email,
    })),
  ];

  function toggleCol(key: ColKey) {
    const next = visibleCols.includes(key) ? visibleCols.filter(k => k !== key) : [...visibleCols, key];
    setVisibleCols(next);
    localStorage.setItem(LS_COLS_KEY, JSON.stringify(next));
  }

  function savePreset() {
    if (!presetName.trim()) return;
    const next = [...presets, { name: presetName.trim(), filters: { search, category: categoryFilter, status: statusFilter, criticality: criticalityFilter, owner: ownerFilter, business_unit: businessUnitFilter } }];
    setPresets(next);
    localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(next));
    setPresetName("");
    setShowPresetSave(false);
  }

  function applyPreset(p: FilterPreset) {
    setSearch(p.filters.search);
    setCategoryFilter(p.filters.category);
    setStatusFilter(p.filters.status);
    setCriticalityFilter(p.filters.criticality);
    setOwnerFilter(p.filters.owner ?? "");
    setBusinessUnitFilter(p.filters.business_unit ?? "");
  }

  function deletePreset(name: string) {
    const next = presets.filter(p => p.name !== name);
    setPresets(next);
    localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(next));
  }

  function clearFilters() {
    setSearch(""); setCategoryFilter(""); setStatusFilter("");
    setCriticalityFilter(""); setOwnerFilter(""); setBusinessUnitFilter("");
  }

  const hasActiveFilters = !!(search || categoryFilter || statusFilter || criticalityFilter || ownerFilter || businessUnitFilter);
  const colCount = visibleCols.length + 1;
  const sel = "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-4">
      {/* Filter row — row 1 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search assets…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={sel}>
          {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={sel}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="retired">Retired</option>
        </select>
        <select value={criticalityFilter} onChange={e => setCriticalityFilter(e.target.value)} className={sel}>
          <option value="">All Criticalities</option>
          <option value="1">1 – Very Low</option>
          <option value="2">2 – Low</option>
          <option value="3">3 – Medium</option>
          <option value="4">4 – High</option>
          <option value="5">5 – Critical</option>
        </select>
        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className={sel}>
          {ownerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={businessUnitFilter} onChange={e => setBusinessUnitFilter(e.target.value)} className={sel}>
          {buOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasActiveFilters && (
          <button onClick={clearFilters} title="Clear all filters"
            className="flex h-9 items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}

        {presets.length > 0 && (
          <select onChange={e => { const p = presets.find(x => x.name === e.target.value); if (p) applyPreset(p); e.target.value = ""; }} className={sel}>
            <option value="">Load preset…</option>
            {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        )}
        <button onClick={() => setShowPresetSave(v => !v)} title="Save filter preset"
          className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1 text-sm hover:bg-muted">
          <Save className="h-3.5 w-3.5" /> Save
        </button>
        <button onClick={() => setShowColPicker(v => !v)} title="Choose visible columns"
          className={cn("flex h-9 items-center gap-1.5 rounded-md border px-3 py-1 text-sm hover:bg-muted", showColPicker ? "border-primary bg-primary/5" : "border-input bg-background")}>
          <Settings2 className="h-3.5 w-3.5" /> Columns
        </button>
      </div>

      {/* Save preset inline */}
      {showPresetSave && (
        <div className="flex items-center gap-2 flex-wrap">
          <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name…"
            className="h-8 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-48" />
          <Button size="sm" onClick={savePreset} disabled={!presetName.trim()}>Save Preset</Button>
          <Button size="sm" variant="outline" onClick={() => setShowPresetSave(false)}>Cancel</Button>
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1 ml-2">
              {presets.map(p => (
                <span key={p.name} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                  {p.name}
                  <button onClick={() => deletePreset(p.name)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Column picker */}
      {showColPicker && (
        <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-4">
          <p className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Visible Columns</p>
          {ALL_COLUMNS.map(col => (
            <label key={col.key} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={visibleCols.includes(col.key)} onChange={() => toggleCol(col.key)} className="rounded" />
              {col.label}
            </label>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(col => (
                  <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{col.label}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr><td colSpan={colCount} className="px-4 py-10 text-center text-muted-foreground">No assets found.</td></tr>
              ) : assets.map(asset => (
                <tr key={asset.id} className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/20"
                  onClick={() => navigate(`/assets/${asset.id}`)}>
                  {visibleCols.includes("name") && <td className="px-4 py-3 font-medium whitespace-nowrap">{asset.name}</td>}
                  {visibleCols.includes("description") && <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{asset.description || "—"}</td>}
                  {visibleCols.includes("category") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{asset.category_name ?? "—"}</td>}
                  {visibleCols.includes("owner") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{asset.owner_name ?? "—"}</td>}
                  {visibleCols.includes("business_unit") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{asset.business_unit_name ?? "—"}</td>}
                  {visibleCols.includes("criticality") && <td className="px-4 py-3"><CriticalityBadge value={asset.criticality as 1|2|3|4|5} /></td>}
                  {visibleCols.includes("confidentiality") && <td className="px-4 py-3"><CIABadge value={asset.confidentiality} /></td>}
                  {visibleCols.includes("integrity") && <td className="px-4 py-3"><CIABadge value={asset.integrity} /></td>}
                  {visibleCols.includes("availability") && <td className="px-4 py-3"><CIABadge value={asset.availability} /></td>}
                  {visibleCols.includes("status") && <td className="px-4 py-3"><Badge variant={asset.status}>{asset.status}</Badge></td>}
                  {visibleCols.includes("asset_value") && <td className="px-4 py-3 text-muted-foreground">{asset.asset_value ? `$${Number(asset.asset_value).toLocaleString()}` : "—"}</td>}
                  {visibleCols.includes("tags") && <td className="px-4 py-3">
                    {asset.tags?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.map(t => <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-xs">{t}</span>)}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>}
                  {visibleCols.includes("notes") && <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{asset.notes || "—"}</td>}
                  {visibleCols.includes("created_at") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{new Date(asset.created_at).toLocaleDateString()}</td>}
                  {visibleCols.includes("updated_at") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{new Date(asset.updated_at).toLocaleDateString()}</td>}
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditAsset(asset); setEditOpen(true); }}
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (window.confirm(`Delete asset "${asset.name}"?`)) deleteAsset.mutate(asset.id); }}
                        className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssetFormModal open={editOpen} onClose={() => { setEditOpen(false); setEditAsset(undefined); }} asset={editAsset} />
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
  const navigate = useNavigate();
  const { data: assetsData, isLoading: assetsLoading } = useAssets({ page_size: 500 });
  const { data: flowsData, isLoading: flowsLoading } = useDataFlows();

  // Auto-filter: any asset whose category name contains "data"
  const dataAssets = useMemo(() => {
    return (assetsData?.results ?? []).filter(
      a => a.category_name?.toLowerCase().includes("data")
    );
  }, [assetsData]);

  const allFlows = flowsData?.results ?? [];

  // Group flows by asset id (source or destination)
  const flowsByAsset = useMemo(() => {
    const map: Record<string, typeof allFlows> = {};
    for (const f of allFlows) {
      for (const id of [f.source_asset, f.destination_asset]) {
        if (!map[id]) map[id] = [];
        if (!map[id].find(x => x.id === f.id)) map[id].push(f);
      }
    }
    return map;
  }, [allFlows]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (assetsLoading || flowsLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Assets are listed here automatically when their category contains "Data" (e.g. Data Asset, Database, Data Store).
        Click a row to expand details and associated Data Flows.
      </p>

      {dataAssets.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center">
          <p className="text-muted-foreground text-sm">No data-type assets found.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create an asset with a category name containing "Data" and it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Business Unit</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Criticality</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">C / I / A</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data Flows</th>
              </tr>
            </thead>
            <tbody>
              {dataAssets.map(asset => {
                const flows = flowsByAsset[asset.id] ?? [];
                const isOpen = expandedId === asset.id;
                return (
                  <>
                    <tr key={asset.id}
                      className="border-b hover:bg-muted/20 cursor-pointer"
                      onClick={() => setExpandedId(isOpen ? null : asset.id)}>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{asset.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{asset.category_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{asset.owner_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{asset.business_unit_name ?? "—"}</td>
                      <td className="px-4 py-3"><CriticalityBadge value={asset.criticality as 1|2|3|4|5} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <CIABadge value={asset.confidentiality} />
                          <CIABadge value={asset.integrity} />
                          <CIABadge value={asset.availability} />
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant={asset.status}>{asset.status}</Badge></td>
                      <td className="px-4 py-3">
                        {flows.length > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {flows.length} flow{flows.length !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${asset.id}-detail`} className="bg-muted/10 border-b">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                            {/* Asset Details */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Asset Details</p>
                              <dl className="space-y-1.5 text-sm">
                                {asset.description && (
                                  <div>
                                    <dt className="text-xs text-muted-foreground">Description</dt>
                                    <dd>{asset.description}</dd>
                                  </div>
                                )}
                                {asset.asset_value && (
                                  <div>
                                    <dt className="text-xs text-muted-foreground">Asset Value</dt>
                                    <dd>${Number(asset.asset_value).toLocaleString()}</dd>
                                  </div>
                                )}
                                {asset.tags?.length > 0 && (
                                  <div>
                                    <dt className="text-xs text-muted-foreground mb-1">Tags</dt>
                                    <dd className="flex flex-wrap gap-1">
                                      {asset.tags.map(t => (
                                        <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-xs">{t}</span>
                                      ))}
                                    </dd>
                                  </div>
                                )}
                                {asset.notes && (
                                  <div>
                                    <dt className="text-xs text-muted-foreground">Notes</dt>
                                    <dd className="text-muted-foreground">{asset.notes}</dd>
                                  </div>
                                )}
                              </dl>
                              <button
                                onClick={e => { e.stopPropagation(); navigate(`/assets/${asset.id}`); }}
                                className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
                                <ExternalLink className="h-3 w-3" /> Open full asset record
                              </button>
                            </div>

                            {/* Associated Data Flows */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                Associated Data Flows
                              </p>
                              {flows.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No data flows linked to this asset.</p>
                              ) : (
                                <div className="space-y-2">
                                  {flows.map(f => (
                                    <button key={f.id}
                                      onClick={e => { e.stopPropagation(); navigate(`/assets/flows/${f.id}`); }}
                                      className="w-full text-left rounded border bg-background p-3 hover:bg-muted/40 transition-colors">
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="font-medium text-sm">{f.name}</span>
                                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {f.source_asset_name} → {f.destination_asset_name}
                                      </p>
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {f.lifecycle_stage && (
                                          <span className="capitalize text-xs bg-muted rounded px-1.5 py-0.5">
                                            {f.lifecycle_stage_display ?? f.lifecycle_stage}
                                          </span>
                                        )}
                                        {f.is_cross_border && <Badge variant="high">Cross-Border</Badge>}
                                        {f.special_category_data && <Badge variant="critical">Special Cat.</Badge>}
                                        {f.legal_basis && (
                                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {f.legal_basis}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Data Flow Mutations ──────────────────────────────────────────────────────

function useCreateDataFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DataFlow>) => apiClient.post<DataFlow>("/assets/data-flows/", data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.dataFlows() }),
  });
}

function useUpdateDataFlow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DataFlow>) => apiClient.patch<DataFlow>(`/assets/data-flows/${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.dataFlows() }),
  });
}

function useDeleteDataFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/data-flows/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.dataFlows() }),
  });
}

// ─── Data Flow Form Modal ─────────────────────────────────────────────────────

const LEGAL_BASIS_OPTIONS = [
  "Consent (Art. 6(1)(a))",
  "Contract (Art. 6(1)(b))",
  "Legal Obligation (Art. 6(1)(c))",
  "Vital Interests (Art. 6(1)(d))",
  "Public Task (Art. 6(1)(e))",
  "Legitimate Interests (Art. 6(1)(f))",
];

const LIFECYCLE_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "collection", label: "Collection" },
  { value: "processing", label: "Processing" },
  { value: "storage", label: "Storage" },
  { value: "sharing", label: "Sharing" },
  { value: "archival", label: "Archival" },
  { value: "deletion", label: "Deletion" },
];

const dfSchema = z.object({
  name: z.string().min(1, "Required"),
  source_asset: z.string().min(1, "Required"),
  destination_asset: z.string().min(1, "Required"),
  data_types: z.string().optional(),
  transfer_mechanism: z.string().optional(),
  is_cross_border: z.boolean(),
  notes: z.string().optional(),
  legal_basis: z.string().optional(),
  data_subject_categories: z.string().optional(),
  personal_data_categories: z.string().optional(),
  special_category_data: z.boolean(),
  retention_period_days: z.coerce.number().nullable().optional(),
  transfer_safeguards: z.string().optional(),
  processing_activity: z.string().optional(),
});
type DfForm = z.infer<typeof dfSchema>;

function DataFlowFormModal({ open, onClose, flow }: { open: boolean; onClose: () => void; flow?: DataFlow }) {
  const { data: assetsData } = useAssets({ page_size: 500 });
  const allAssets = assetsData?.results ?? [];
  const createFlow = useCreateDataFlow();
  const updateFlow = useUpdateDataFlow(flow?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DfForm>({
    resolver: zodResolver(dfSchema),
    defaultValues: flow ? {
      name: flow.name, source_asset: flow.source_asset, destination_asset: flow.destination_asset,
      data_types: flow.data_types, transfer_mechanism: flow.transfer_mechanism,
      is_cross_border: flow.is_cross_border, notes: flow.notes,
      legal_basis: flow.legal_basis, data_subject_categories: flow.data_subject_categories,
      personal_data_categories: flow.personal_data_categories,
      special_category_data: flow.special_category_data,
      retention_period_days: flow.retention_period_days,
      transfer_safeguards: flow.transfer_safeguards,
      processing_activity: flow.processing_activity ?? "",
    } : {
      name: "", source_asset: "", destination_asset: "", data_types: "", transfer_mechanism: "",
      is_cross_border: false, notes: "", legal_basis: "", data_subject_categories: "",
      personal_data_categories: "", special_category_data: false, retention_period_days: null,
      transfer_safeguards: "", processing_activity: "",
    },
  });

  async function onSubmit(values: DfForm) {
    const payload = { ...values, processing_activity: values.processing_activity || null, retention_period_days: values.retention_period_days || null };
    if (flow) await updateFlow.mutateAsync(payload); else await createFlow.mutateAsync(payload);
    reset(); onClose();
  }

  const assetOptions = allAssets.map(a => ({ value: a.id, label: a.name }));

  return (
    <Modal open={open} onClose={onClose} title={flow ? "Edit Data Flow" : "New Data Flow"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="Name *" error={errors.name?.message} {...register("name")} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Source Asset *</label>
            <select {...register("source_asset")} className={cn("w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring", errors.source_asset && "border-destructive")}>
              <option value="">Select…</option>
              {assetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Destination Asset *</label>
            <select {...register("destination_asset")} className={cn("w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring", errors.destination_asset && "border-destructive")}>
              <option value="">Select…</option>
              {assetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Textarea label="Data Types" rows={2} {...register("data_types")} />
          <Textarea label="Transfer Mechanism" rows={2} {...register("transfer_mechanism")} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="df-cross-border" {...register("is_cross_border")} />
          <label htmlFor="df-cross-border" className="text-sm font-medium">Cross-Border Transfer</label>
        </div>

        {/* GDPR section */}
        <fieldset className="border rounded-lg p-4 space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">GDPR / Data Lifecycle</legend>
          <div>
            <label className="text-sm font-medium block mb-1">Legal Basis (GDPR Art. 6)</label>
            <select {...register("legal_basis")} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">— Not specified —</option>
              {LEGAL_BASIS_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Textarea label="Data Subject Categories" rows={2} placeholder="e.g. Employees, Customers" {...register("data_subject_categories")} />
            <Textarea label="Personal Data Categories" rows={2} placeholder="e.g. Name, Email, Location" {...register("personal_data_categories")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Retention Period (days)</label>
              <input type="number" {...register("retention_period_days")} min={0} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="df-special" {...register("special_category_data")} />
              <label htmlFor="df-special" className="text-sm font-medium">Special Category Data (Art. 9)</label>
            </div>
          </div>
          <Textarea label="Transfer Safeguards" rows={2} placeholder="SCC, Adequacy Decision, BCR…" {...register("transfer_safeguards")} />
        </fieldset>

        <Textarea label="Notes" rows={2} {...register("notes")} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{flow ? "Save" : "Create Flow"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Flow Columns & Presets ───────────────────────────────────────────────────

const ALL_FLOW_COLUMNS = [
  { key: "name",                     label: "Name" },
  { key: "source",                   label: "Source Asset" },
  { key: "destination",              label: "Destination Asset" },
  { key: "data_types",               label: "Data Types" },
  { key: "transfer_mechanism",       label: "Transfer Mechanism" },
  { key: "legal_basis",              label: "Legal Basis (GDPR)" },
  { key: "is_cross_border",          label: "Cross-Border" },
  { key: "special_category_data",    label: "Special Category" },
  { key: "data_subject_categories",  label: "Data Subject Categories" },
  { key: "personal_data_categories", label: "Personal Data Categories" },
  { key: "retention_period_days",    label: "Retention (days)" },
  { key: "transfer_safeguards",      label: "Transfer Safeguards" },
  { key: "processing_activity",      label: "Processing Activity" },
  { key: "notes",                    label: "Notes" },
  { key: "created_at",               label: "Created" },
  { key: "updated_at",               label: "Updated" },
] as const;
type FlowColKey = typeof ALL_FLOW_COLUMNS[number]["key"];

const DEFAULT_FLOW_COLS: FlowColKey[] = [
  "name", "source", "destination", "data_types", "legal_basis",
  "is_cross_border", "special_category_data",
];

const LS_FLOW_COLS_KEY    = "mira_flow_visible_cols";
const LS_FLOW_PRESETS_KEY = "mira_flow_filter_presets";

interface FlowFilterState {
  search: string; source_asset: string; destination_asset: string;
  is_cross_border: string; special_category_data: string;
}
interface FlowFilterPreset { name: string; filters: FlowFilterState; }

function loadFlowVisibleCols(): FlowColKey[] {
  try { const v = localStorage.getItem(LS_FLOW_COLS_KEY); return v ? JSON.parse(v) : DEFAULT_FLOW_COLS; }
  catch { return DEFAULT_FLOW_COLS; }
}
function loadFlowPresets(): FlowFilterPreset[] {
  try { const v = localStorage.getItem(LS_FLOW_PRESETS_KEY); return v ? JSON.parse(v) : []; }
  catch { return []; }
}

// ─── Data Flows Tab ───────────────────────────────────────────────────────────

function DataFlowsTab() {
  const navigate = useNavigate();
  const [search,           setSearch]           = useState("");
  const [sourceFilter,     setSourceFilter]     = useState("");
  const [destFilter,       setDestFilter]       = useState("");
  const [crossBorderFilter,setCrossBorderFilter]= useState("");
  const [specialCatFilter, setSpecialCatFilter] = useState("");
  const [visibleCols,      setVisibleCols]      = useState<FlowColKey[]>(loadFlowVisibleCols);
  const [showColPicker,    setShowColPicker]    = useState(false);
  const [presets,          setPresets]          = useState<FlowFilterPreset[]>(loadFlowPresets);
  const [presetName,       setPresetName]       = useState("");
  const [showPresetSave,   setShowPresetSave]   = useState(false);
  const [modalOpen,        setModalOpen]        = useState(false);
  const [editFlow,         setEditFlow]         = useState<DataFlow | undefined>();

  const deleteFlow = useDeleteDataFlow();
  const { data: assetsData } = useAssets({ page_size: 500 });
  const allAssets = assetsData?.results ?? [];

  const apiParams = useMemo(() => ({
    search:            search || undefined,
    source_asset:      sourceFilter || undefined,
    destination_asset: destFilter || undefined,
    is_cross_border:   crossBorderFilter !== "" ? (crossBorderFilter === "true") : undefined,
  }), [search, sourceFilter, destFilter, crossBorderFilter]);

  const { data, isLoading } = useDataFlows(apiParams as Record<string, unknown>);

  // Client-side filter for special_category_data (not a backend filterset field)
  const dataFlows = useMemo(() => {
    const all = data?.results ?? [];
    if (!specialCatFilter) return all;
    return all.filter(df =>
      specialCatFilter === "true" ? df.special_category_data : !df.special_category_data
    );
  }, [data, specialCatFilter]);

  const assetOptions = [
    ...allAssets.map(a => ({ value: a.id, label: a.name })),
  ];

  function toggleCol(key: FlowColKey) {
    const next = visibleCols.includes(key)
      ? visibleCols.filter(k => k !== key)
      : [...visibleCols, key];
    setVisibleCols(next);
    localStorage.setItem(LS_FLOW_COLS_KEY, JSON.stringify(next));
  }

  function savePreset() {
    if (!presetName.trim()) return;
    const next = [...presets, {
      name: presetName.trim(),
      filters: { search, source_asset: sourceFilter, destination_asset: destFilter, is_cross_border: crossBorderFilter, special_category_data: specialCatFilter },
    }];
    setPresets(next);
    localStorage.setItem(LS_FLOW_PRESETS_KEY, JSON.stringify(next));
    setPresetName(""); setShowPresetSave(false);
  }

  function applyPreset(p: FlowFilterPreset) {
    setSearch(p.filters.search ?? "");
    setSourceFilter(p.filters.source_asset ?? "");
    setDestFilter(p.filters.destination_asset ?? "");
    setCrossBorderFilter(p.filters.is_cross_border ?? "");
    setSpecialCatFilter(p.filters.special_category_data ?? "");
  }

  function deletePreset(name: string) {
    const next = presets.filter(p => p.name !== name);
    setPresets(next);
    localStorage.setItem(LS_FLOW_PRESETS_KEY, JSON.stringify(next));
  }

  function clearFilters() {
    setSearch(""); setSourceFilter(""); setDestFilter("");
    setCrossBorderFilter(""); setSpecialCatFilter("");
  }

  const hasActiveFilters = !!(search || sourceFilter || destFilter || crossBorderFilter || specialCatFilter);
  const colCount = visibleCols.length + 1;
  const sel = "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-4">
      {/* Filter + action row */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search flows…" value={search} onChange={e => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={sel}>
            <option value="">All Sources</option>
            {assetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={destFilter} onChange={e => setDestFilter(e.target.value)} className={sel}>
            <option value="">All Destinations</option>
            {assetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={crossBorderFilter} onChange={e => setCrossBorderFilter(e.target.value)} className={sel}>
            <option value="">All Transfers</option>
            <option value="true">Cross-Border</option>
            <option value="false">Domestic Only</option>
          </select>
          <select value={specialCatFilter} onChange={e => setSpecialCatFilter(e.target.value)} className={sel}>
            <option value="">All Data</option>
            <option value="true">Special Category</option>
            <option value="false">Standard Data</option>
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} title="Clear filters"
              className="flex h-9 items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}

          {presets.length > 0 && (
            <select onChange={e => { const p = presets.find(x => x.name === e.target.value); if (p) applyPreset(p); e.target.value = ""; }} className={sel}>
              <option value="">Load preset…</option>
              {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowPresetSave(v => !v)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1 text-sm hover:bg-muted">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
          <button onClick={() => setShowColPicker(v => !v)}
            className={cn("flex h-9 items-center gap-1.5 rounded-md border px-3 py-1 text-sm hover:bg-muted", showColPicker ? "border-primary bg-primary/5" : "border-input bg-background")}>
            <Settings2 className="h-3.5 w-3.5" /> Columns
          </button>
        </div>
        <Button onClick={() => { setEditFlow(undefined); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> New Data Flow
        </Button>
      </div>

      {/* Save preset inline */}
      {showPresetSave && (
        <div className="flex items-center gap-2 flex-wrap">
          <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name…"
            className="h-8 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-48" />
          <Button size="sm" onClick={savePreset} disabled={!presetName.trim()}>Save Preset</Button>
          <Button size="sm" variant="outline" onClick={() => setShowPresetSave(false)}>Cancel</Button>
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1 ml-2">
              {presets.map(p => (
                <span key={p.name} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                  {p.name}
                  <button onClick={() => deletePreset(p.name)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Column picker */}
      {showColPicker && (
        <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-4">
          <p className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Visible Columns</p>
          {ALL_FLOW_COLUMNS.map(col => (
            <label key={col.key} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={visibleCols.includes(col.key)} onChange={() => toggleCol(col.key)} className="rounded" />
              {col.label}
            </label>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {ALL_FLOW_COLUMNS.filter(c => visibleCols.includes(c.key)).map(col => (
                  <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{col.label}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataFlows.length === 0 ? (
                <tr><td colSpan={colCount} className="px-4 py-10 text-center text-muted-foreground">No data flows found.</td></tr>
              ) : dataFlows.map(df => (
                <tr key={df.id} className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/20"
                  onClick={() => navigate(`/assets/flows/${df.id}`)}>
                  {visibleCols.includes("name") && <td className="px-4 py-3 font-medium whitespace-nowrap">{df.name}</td>}
                  {visibleCols.includes("source") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{df.source_asset_name ?? "—"}</td>}
                  {visibleCols.includes("destination") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{df.destination_asset_name ?? "—"}</td>}
                  {visibleCols.includes("data_types") && <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{df.data_types || "—"}</td>}
                  {visibleCols.includes("transfer_mechanism") && <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{df.transfer_mechanism || "—"}</td>}
                  {visibleCols.includes("legal_basis") && <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">{df.legal_basis || "—"}</td>}
                  {visibleCols.includes("is_cross_border") && <td className="px-4 py-3">
                    {df.is_cross_border ? <Badge variant="high">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>}
                  </td>}
                  {visibleCols.includes("special_category_data") && <td className="px-4 py-3">
                    {df.special_category_data ? <Badge variant="critical">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>}
                  </td>}
                  {visibleCols.includes("data_subject_categories") && <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">{df.data_subject_categories || "—"}</td>}
                  {visibleCols.includes("personal_data_categories") && <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">{df.personal_data_categories || "—"}</td>}
                  {visibleCols.includes("retention_period_days") && <td className="px-4 py-3 text-muted-foreground">{df.retention_period_days ?? "—"}</td>}
                  {visibleCols.includes("transfer_safeguards") && <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">{df.transfer_safeguards || "—"}</td>}
                  {visibleCols.includes("processing_activity") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{df.processing_activity_name ?? "—"}</td>}
                  {visibleCols.includes("notes") && <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{df.notes || "—"}</td>}
                  {visibleCols.includes("created_at") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{new Date(df.created_at).toLocaleDateString()}</td>}
                  {visibleCols.includes("updated_at") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{new Date(df.updated_at).toLocaleDateString()}</td>}
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditFlow(df); setModalOpen(true); }}
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Delete flow?")) deleteFlow.mutate(df.id); }}
                        className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DataFlowFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditFlow(undefined); }} flow={editFlow} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssetListPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get("tab") as Tab) ?? "all");
  const [showModal, setShowModal] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleCloseModal = () => setShowModal(false);

  const { data: contentTypes = [] } = useContentTypes();
  const assetContentTypeId = contentTypes.find((ct) => ct.label === "assets.asset")?.id;

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
          <p className="text-sm text-muted-foreground">Manage organizational assets, data assets, and data flows.</p>
        </div>
        {activeTab === "all" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> New Asset
            </Button>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground")}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "all" && <AllAssetsTab />}
      {activeTab === "data_assets" && <DataAssetsTab />}
      {activeTab === "data_flows" && <DataFlowsTab />}
      {activeTab === "reviews" && (
        <ModuleReviewsTab contentTypeId={assetContentTypeId} moduleLabel="Asset" objects={assetObjects} />
      )}
      {activeTab === "bulk_upload" && (
        <BulkUploadTab onSuccess={() => queryClient.invalidateQueries({ queryKey: assetKeys.lists() })} />
      )}
      {activeTab === "status_rules" && (
        <ModuleStatusRulesTab contentTypeLabel="assets.asset" moduleLabel="Asset" />
      )}

      <AssetFormModal open={showModal} onClose={handleCloseModal} asset={undefined} />

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
