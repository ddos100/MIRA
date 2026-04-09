import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { BulkUploadSection } from "@/components/common/BulkUploadSection";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { useRisks, useDeleteRisk, useRiskCategories, riskKeys } from "@/api/risks";
import { useExportCsv } from "@/api/useExportCsv";
import { ImportModal } from "@/components/common/ImportModal";
import type { Risk } from "@/types";
import RiskFormModal from "./RiskFormModal";
import { ModuleStatusRulesTab } from "@/components/common/ModuleStatusRulesTab";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_treatment", label: "In Treatment" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
  { value: "transferred", label: "Transferred" },
];

const TREATMENT_LABELS: Record<string, string> = {
  mitigate: "Mitigate",
  avoid: "Avoid",
  transfer: "Transfer",
  accept: "Accept",
};

function scoreToRating(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 15) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "medium";
  return "low";
}

function ScoreBadge({ score, rating }: { score: number; rating: string }) {
  const r = rating || scoreToRating(score);
  return (
    <Badge variant={r}>
      {score} — {r.charAt(0).toUpperCase() + r.slice(1)}
    </Badge>
  );
}

type Tab = "list" | "bulk_upload" | "status_rules";

export default function RiskListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);
  const { exportCsv, isExporting } = useExportCsv();

  const { data: categoriesData } = useRiskCategories();
  const categories = categoriesData ?? [];

  const params: Record<string, unknown> = { page, page_size: PAGE_SIZE };
  if (search) params.search = search;
  if (status) params.status = status;
  if (categoryId) params.category = categoryId;

  const { data, isLoading } = useRisks(params);
  const risks: Risk[] = data?.results ?? [];
  const totalPages = data?.total_pages ?? Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const deleteRisk = useDeleteRisk();

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(e.target.value);
    setPage(1);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCategoryId(e.target.value);
    setPage(1);
  }

  function openCreate() {
    setEditingRisk(null);
    setModalOpen(true);
  }

  function openEdit(risk: Risk) {
    setEditingRisk(risk);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRisk(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteRisk.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  const columns: Column<Risk>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (row) => (
        <button
          className="text-left font-medium text-foreground hover:underline"
          onClick={() => navigate(`/risks/${row.id}`)}
        >
          {row.title}
        </button>
      ),
    },
    {
      key: "category_name",
      header: "Category",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.category_name ?? row.category_detail?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "owner_name",
      header: "Owner",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.owner_name ?? row.owner_detail?.full_name ?? "—"}
        </span>
      ),
    },
    {
      key: "inherent_score",
      header: "Inherent Score",
      render: (row) => (
        <ScoreBadge score={row.inherent_score} rating={row.inherent_rating} />
      ),
    },
    {
      key: "residual_score",
      header: "Residual Score",
      render: (row) => (
        <ScoreBadge score={row.residual_score} rating={row.residual_rating} />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status}>
          {row.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
      ),
    },
    {
      key: "treatment_type",
      header: "Treatment",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.treatment_type ? TREATMENT_LABELS[row.treatment_type] ?? row.treatment_type : "—"}
        </span>
      ),
    },
    {
      key: "review_date",
      header: "Review Date",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.review_date
            ? new Date(row.review_date).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      key: "asset_names",
      header: "Assets",
      render: (row) => {
        const names = row.asset_names ?? [];
        if (names.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {names.slice(0, 2).map((n) => (
              <span key={n} className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs">
                {n}
              </span>
            ))}
            {names.length > 2 && (
              <span className="text-xs text-muted-foreground">+{names.length - 2}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
            aria-label="Edit risk"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            aria-label="Delete risk"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Register"
        description="Track and manage organisational risks."
        actions={
          activeTab === "list" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  exportCsv("/risks/export-csv/", "risks", {
                    search: search || undefined,
                    status: status || undefined,
                    category: categoryId || undefined,
                  })
                }
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Exporting…" : "Export CSV"}
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New Risk
              </Button>
            </div>
          ) : null
        }
      />

      {/* Tab Bar */}
      <div className="flex gap-1 border-b">
        {([
          ["list", "Risk Register"],
          ["bulk_upload", "Bulk Upload"],
          ["status_rules", "Status Rules"],
        ] as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "bulk_upload" && (
        <RiskBulkUploadTab onSuccess={() => queryClient.invalidateQueries({ queryKey: riskKeys.lists() })} />
      )}

      {activeTab === "status_rules" && (
        <ModuleStatusRulesTab contentTypeLabel="risks.risk" moduleLabel="Risk" />
      )}

      {activeTab === "list" && <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search risks..."
          className="w-64"
        />
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={handleStatusChange}
          className="w-44"
          aria-label="Filter by status"
        />
        <Select
          options={categoryOptions}
          value={categoryId}
          onChange={handleCategoryChange}
          className="w-44"
          aria-label="Filter by category"
        />
      </div>

      <DataTable<Risk>
        data={risks}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No risks found. Create one to get started."
      />

      {totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {modalOpen && (
        <RiskFormModal
          open={modalOpen}
          onClose={closeModal}
          risk={editingRisk}
        />
      )}

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/risks/import-csv/"
        entityName="Risks"
        templateColumns={["title", "status", "treatment_type", "description", "identified_date"]}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: riskKeys.lists() })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Risk"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteRisk.isPending}
      />
      </>}
    </div>
  );
}

// ─── Bulk Upload Tab ──────────────────────────────────────────────────────────

const RISK_COLUMNS = [
  { name: "title", description: "Risk title", required: "Yes" },
  { name: "description", description: "Detailed description", required: "No" },
  { name: "status", description: "open | in_treatment | accepted | closed | transferred", required: "No (default open)" },
  { name: "treatment_type", description: "mitigate | avoid | transfer | accept", required: "No" },
  { name: "likelihood", description: "1–5 likelihood score", required: "No (default 3)" },
  { name: "impact", description: "1–5 impact score", required: "No (default 3)" },
  { name: "identified_date", description: "ISO date (YYYY-MM-DD)", required: "No" },
];

function RiskBulkUploadTab({ onSuccess }: { onSuccess: () => void }) {
  return (
    <BulkUploadSection
      endpoint="/risks/import-csv/"
      entityName="Risks"
      columns={RISK_COLUMNS}
      onSuccess={onSuccess}
    />
  );
}
