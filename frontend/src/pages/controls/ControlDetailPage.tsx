import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Pencil, Paperclip } from "lucide-react";
import { useControl, useControlTests, useControlIssues } from "@/api/controls";
import { CommentsPanel } from "@/components/common/CommentsPanel";
import { AttachmentsPanel } from "@/components/common/AttachmentsPanel";

const resultColors: Record<string, string> = {
  pass: "text-green-600",
  fail: "text-red-600",
  partial: "text-yellow-600",
  not_tested: "text-gray-400",
};

const ResultIcon = ({ result }: { result: string }) => {
  if (result === "pass") return <CheckCircle className={`h-4 w-4 ${resultColors.pass}`} />;
  if (result === "fail") return <XCircle className={`h-4 w-4 ${resultColors.fail}`} />;
  return <AlertCircle className={`h-4 w-4 ${resultColors.partial}`} />;
};

export default function ControlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: control, isLoading } = useControl(id!);
  const { data: tests = [] } = useControlTests(id!);
  const { data: issues = [] } = useControlIssues(id!);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!control) return <div className="text-muted-foreground">Control not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="mt-1 p-1 rounded hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{control.title}</h1>
          <div className="flex gap-2 mt-1">
            <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5 font-medium capitalize">
              {control.control_type}
            </span>
            <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium capitalize ${
              control.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
            }`}>
              {control.status}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate(`/controls/${id}/edit`)}
          className="flex items-center gap-1.5 border px-3 py-1.5 rounded-md text-sm font-medium hover:bg-accent"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-3">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{control.description}</p>
          </div>

          {/* Tests */}
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-4">Audit Tests ({tests.length})</h2>
            {tests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tests recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {(tests as Record<string, string>[]).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 text-sm border-b pb-2 last:border-0">
                    <ResultIcon result={t.result} />
                    <span className="font-medium">{t.test_date}</span>
                    <span className={`capitalize ${resultColors[t.result]}`}>{t.result}</span>
                    {t.description && (
                      <span className="text-muted-foreground truncate flex-1">{t.description}</span>
                    )}
                    {t.evidence_file && (
                      <a
                        href={t.evidence_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                        title="View evidence file"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Evidence
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Issues */}
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-4">Issues ({issues.length})</h2>
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues found.</p>
            ) : (
              <div className="space-y-2">
                {(issues as Record<string, string>[]).map((issue) => (
                  <div key={issue.id} className="flex items-center gap-3 text-sm border-b pb-2 last:border-0">
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                      issue.severity === "critical" ? "bg-red-100 text-red-800" :
                      issue.severity === "high" ? "bg-orange-100 text-orange-800" :
                      issue.severity === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-green-100 text-green-800"
                    }`}>
                      {issue.severity}
                    </span>
                    <span className="font-medium flex-1">{issue.title}</span>
                    <span className={`capitalize ${
                      issue.status === "open" ? "text-red-600" :
                      issue.status === "resolved" ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border rounded-lg p-4 space-y-3 text-sm">
            <h3 className="font-semibold">Details</h3>
            <div><span className="text-muted-foreground">Type:</span> <span className="capitalize ml-2">{control.control_type}</span></div>
            <div><span className="text-muted-foreground">Frequency:</span> <span className="capitalize ml-2">{control.frequency}</span></div>
            <div><span className="text-muted-foreground">Version:</span> <span className="ml-2">{control.version}</span></div>
            <div><span className="text-muted-foreground">Last Review:</span> <span className="ml-2">{control.last_review_date ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Next Review:</span> <span className="ml-2">{control.next_review_date ?? "—"}</span></div>
          </div>

          <div className="bg-card border rounded-lg p-4 text-sm">
            <h3 className="font-semibold mb-3">Test Summary</h3>
            {(() => {
              const t = tests as Record<string, string>[];
              const pass = t.filter((x) => x.result === "pass").length;
              const fail = t.filter((x) => x.result === "fail").length;
              const pct = t.length ? Math.round((pass / t.length) * 100) : 0;
              return (
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Tests</span><span>{t.length}</span></div>
                  <div className="flex justify-between"><span className="text-green-600">Passed</span><span>{pass}</span></div>
                  <div className="flex justify-between"><span className="text-red-600">Failed</span><span>{fail}</span></div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">{pct}% pass rate</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Comments & Attachments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-card border rounded-lg p-5">
          <CommentsPanel contentType="controls.control" objectId={id!} />
        </div>
        <div className="bg-card border rounded-lg p-5">
          <AttachmentsPanel contentType="controls.control" objectId={id!} />
        </div>
      </div>
    </div>
  );
}
