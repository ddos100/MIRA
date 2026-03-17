import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Plus, XCircle } from "lucide-react";
import { useExceptions, useApproveException } from "@/api/exceptions";
import { useAuthStore } from "@/store/authStore";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-600",
  expired: "bg-gray-100 text-gray-600",
  revoked: "bg-gray-100 text-gray-600",
};

const typeColors: Record<string, string> = {
  risk: "bg-red-100 text-red-800",
  compliance: "bg-blue-100 text-blue-800",
  policy: "bg-purple-100 text-purple-800",
  control: "bg-orange-100 text-orange-800",
};

function ExceptionListPage() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useExceptions({
    search,
    status: statusFilter || undefined,
    exception_type: typeFilter || undefined,
    page,
  });

  const exceptions = data?.results ?? [];
  const totalPages = data?.total_pages ?? 1;
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exception Register</h1>
          <p className="text-muted-foreground">Track risk, compliance, policy and control exceptions.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Request Exception
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Search exceptions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="risk">Risk</option>
          <option value="compliance">Compliance</option>
          <option value="policy">Policy</option>
          <option value="control">Control</option>
        </select>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Requester</th>
              <th className="text-left px-4 py-3 font-medium">Expiry</th>
              {isAdmin && <th className="text-left px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isAdmin ? 6 : 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : exceptions.length === 0
              ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground">
                    <XCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No exceptions found.
                  </td>
                </tr>
              )
              : (exceptions as Record<string, string>[]).map((exc) => (
                <ExceptionRow key={exc.id} exc={exc} isAdmin={isAdmin} />
              ))}
          </tbody>
        </table>
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
    </div>
  );
}

function ExceptionRow({ exc, isAdmin }: { exc: Record<string, string>; isAdmin: boolean | undefined }) {
  const approve = useApproveException(exc.id);

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="font-medium">{exc.title}</div>
        <div className="text-xs text-muted-foreground line-clamp-1">{exc.justification}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${typeColors[exc.exception_type] ?? "bg-gray-100 text-gray-800"}`}>
          {exc.exception_type}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColors[exc.status] ?? "bg-gray-100"}`}>
          {exc.status}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{exc.requester_name ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground">{exc.expiry_date ?? "—"}</td>
      {isAdmin && (
        <td className="px-4 py-3">
          {exc.status === "pending" && (
            <button
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          )}
        </td>
      )}
    </tr>
  );
}

export default function ExceptionsPage() {
  return (
    <Routes>
      <Route index element={<ExceptionListPage />} />
    </Routes>
  );
}
