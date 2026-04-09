import { useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { Plus, FileText, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePolicies, useAcknowledgePolicy, policyKeys } from "@/api/policies";
import { BulkUploadSection } from "@/components/common/BulkUploadSection";
import { ModuleStatusRulesTab } from "@/components/common/ModuleStatusRulesTab";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  retired: "bg-red-100 text-red-600",
};

const POLICY_COLUMNS = [
  { name: "title", description: "Policy title", required: "Yes" },
  { name: "status", description: "draft | under_review | approved | retired", required: "No (default draft)" },
  { name: "version", description: "Version string e.g. 1.0", required: "No" },
  { name: "summary", description: "Short summary", required: "No" },
  { name: "content", description: "Full policy content", required: "No" },
  { name: "review_date", description: "ISO date (YYYY-MM-DD)", required: "No" },
];

type PolicyTab = "policies" | "bulk_upload" | "status_rules";

function PolicyListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PolicyTab>("policies");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePolicies({
    search,
    status: statusFilter || undefined,
    page,
  });

  const policies = data?.results ?? [];
  const totalPages = data?.total_pages ?? 1;
  const acknowledgePolicy = useAcknowledgePolicy();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policy Library</h1>
          <p className="text-muted-foreground">Manage organizational policies and track acknowledgements.</p>
        </div>
        {activeTab === "policies" && (
          <button
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Policy
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b">
        {([
          ["policies", "Policies"],
          ["bulk_upload", "Bulk Upload"],
          ["status_rules", "Status Rules"],
        ] as [PolicyTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "bulk_upload" && (
        <BulkUploadSection
          endpoint="/policies/policies/import-csv/"
          entityName="Policies"
          columns={POLICY_COLUMNS}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: policyKeys.lists() })}
        />
      )}

      {activeTab === "status_rules" && (
        <ModuleStatusRulesTab contentTypeLabel="policies.policy" moduleLabel="Policy" />
      )}

      {activeTab === "policies" && (
        <>
          <div className="flex gap-3">
            <input
              type="search"
              placeholder="Search policies..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-36 bg-muted animate-pulse rounded-lg" />
                ))
              : policies.length === 0
              ? (
                <div className="col-span-3 py-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No policies found.
                </div>
              )
              : (policies as Record<string, string>[]).map((policy) => (
                <div
                  key={policy.id}
                  className="bg-card border rounded-lg p-5 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => navigate(`/policies/${policy.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm leading-snug">{policy.title}</h3>
                    <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium shrink-0 ${statusColors[policy.status] ?? "bg-gray-100"}`}>
                      {policy.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{policy.summary || "No summary."}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>v{policy.version}</span>
                    {policy.review_date && <span>Review: {policy.review_date}</span>}
                    {policy.acknowledgement_required === "true" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgePolicy.mutate(policy.id);
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <CheckCircle className="h-3 w-3" /> Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50">Previous</button>
              <span className="px-3 py-1 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <Routes>
      <Route index element={<PolicyListPage />} />
    </Routes>
  );
}
