import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, History, Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import {
  usePolicy,
  usePolicyVersions,
  usePolicyAcknowledgements,
  useAcknowledgePolicy,
} from "@/api/policies";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { PolicyVersion } from "@/types";

const statusColors: Record<string, string> = {
  draft: "draft",
  under_review: "in_progress",
  approved: "approved",
  retired: "inactive",
};

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: policy, isLoading, isError } = usePolicy(id ?? "");
  const { data: versions, isLoading: versionsLoading } = usePolicyVersions(id ?? "");
  const { data: acks } = usePolicyAcknowledgements(id ?? "");
  const acknowledge = useAcknowledgePolicy();

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  }

  if (isError || !policy) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load policy.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/policies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{policy.title}</h1>
            <Badge variant={statusColors[policy.status] ?? "outline"}>{policy.status.replace("_", " ")}</Badge>
            <span className="text-sm text-muted-foreground">v{policy.version}</span>
          </div>
          {policy.summary && (
            <p className="text-sm text-muted-foreground mt-1">{policy.summary}</p>
          )}
        </div>
        {policy.acknowledgement_required && (
          <Button
            size="sm"
            onClick={() => acknowledge.mutate(policy.id)}
            isLoading={acknowledge.isPending}
          >
            <CheckCircle className="h-4 w-4" />
            Acknowledge
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Policy content */}
          {policy.content && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm whitespace-pre-wrap">{policy.content}</p>
              </CardContent>
            </Card>
          )}

          {/* Version History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-muted-foreground" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {versionsLoading ? (
                <div className="flex justify-center py-4"><LoadingSpinner /></div>
              ) : !versions || versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No version snapshots recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {(versions as PolicyVersion[]).map((v) => (
                    <div key={v.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">v{v.version}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(v.approved_at), "MMM d, yyyy")}
                          {v.approved_by_name && ` · ${v.approved_by_name}`}
                        </span>
                      </div>
                      {v.content && (
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{v.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {policy.owner_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  <span>{policy.owner_name}</span>
                </div>
              )}
              {policy.category_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span>{policy.category_name}</span>
                </div>
              )}
              {policy.review_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Review Date</span>
                  <span>{format(new Date(policy.review_date), "MMM d, yyyy")}</span>
                </div>
              )}
              {policy.effective_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective</span>
                  <span>{format(new Date(policy.effective_date), "MMM d, yyyy")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Acknowledgement</span>
                <Badge variant={policy.acknowledgement_required ? "high" : "inactive"}>
                  {policy.acknowledgement_required ? "Required" : "Not required"}
                </Badge>
              </div>
              {(policy.versions_count ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versions</span>
                  <span>{policy.versions_count}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acknowledgements */}
          {acks && acks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Acknowledgements ({acks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
                  {(acks as Record<string, string>[]).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-0">
                      <span className="truncate">{a.user_name ?? a.user}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {a.acknowledged_at ? format(new Date(a.acknowledged_at), "MMM d, yyyy") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
