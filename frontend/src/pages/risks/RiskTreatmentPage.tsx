import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { useAllTreatmentPlans } from "@/api/risks";
import type { RiskTreatmentPlan } from "@/types";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

export default function RiskTreatmentPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const params: Record<string, unknown> = { page, page_size: PAGE_SIZE };
  if (status) params.status = status;

  const { data, isLoading } = useAllTreatmentPlans(params);
  const plans: RiskTreatmentPlan[] = data?.results ?? [];
  const totalPages =
    data?.total_pages ?? Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(e.target.value);
    setPage(1);
  }

  const columns: Column<RiskTreatmentPlan>[] = [
    {
      key: "risk_title",
      header: "Risk",
      render: (row) => {
        const title = row.risk_detail?.title ?? "—";
        const riskId = row.risk_detail?.id ?? row.risk;
        return (
          <button
            className="text-left text-sm font-medium text-foreground hover:underline"
            onClick={() => navigate(`/risks/${riskId}`)}
          >
            {title}
          </button>
        );
      },
    },
    {
      key: "title",
      header: "Plan Title",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-foreground">{row.title}</span>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.owner_detail?.full_name ?? "—"}
        </span>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}
        </span>
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
      key: "created_at",
      header: "Created",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treatment Plans"
        description="Track all risk treatment and remediation plans."
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={handleStatusChange}
          className="w-44"
          aria-label="Filter by status"
        />
      </div>

      <DataTable<RiskTreatmentPlan>
        data={plans}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No treatment plans found."
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
    </div>
  );
}
