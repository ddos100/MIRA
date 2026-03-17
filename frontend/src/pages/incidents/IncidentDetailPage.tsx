import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle, Send, AlertTriangle, Shield } from "lucide-react";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";

import {
  useIncident,
  useIncidentUpdates,
  useCreateIncidentUpdate,
  useResolveIncident,
  useCloseIncident,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/api/incidents";
import { IncidentFormModal } from "./IncidentListPage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const severityLabels: Record<IncidentSeverity, string> = {
  p1: "P1 – Critical",
  p2: "P2 – High",
  p3: "P3 – Medium",
  p4: "P4 – Low",
};

const statusLabels: Record<IncidentStatus, string> = {
  new: "New",
  triaged: "Triaged",
  investigating: "Investigating",
  contained: "Contained",
  resolved: "Resolved",
  closed: "Closed",
};

const statusVariants: Record<IncidentStatus, string> = {
  new: "open",
  triaged: "pending",
  investigating: "in_progress",
  contained: "medium",
  resolved: "completed",
  closed: "closed",
};

function dateRow(label: string, value: string | null) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{format(new Date(value), "MMM d, yyyy HH:mm")}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [updateBody, setUpdateBody] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [resolveConfirm, setResolveConfirm] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);

  const { data: incident, isLoading, isError } = useIncident(id ?? "");
  const { data: updatesData, isLoading: updatesLoading } = useIncidentUpdates(id ?? "");
  const updates = (updatesData?.results ?? []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const createUpdate = useCreateIncidentUpdate();
  const resolveIncident = useResolveIncident(id ?? "");
  const closeIncident = useCloseIncident(id ?? "");

  function handleAddUpdate() {
    if (!updateBody.trim() || !id) return;
    createUpdate.mutate(
      { incident: id, body: updateBody },
      { onSuccess: () => setUpdateBody("") }
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  }

  if (isError || !incident) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load incident details.
      </div>
    );
  }

  const canResolve = !["resolved", "closed"].includes(incident.status);
  const canClose = incident.status === "resolved";
  const timeSinceDetection = incident.detected_at
    ? differenceInHours(new Date(), new Date(incident.detected_at))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/incidents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{incident.title}</h1>
              <Badge variant={incident.severity}>{severityLabels[incident.severity]}</Badge>
              <Badge variant={statusVariants[incident.status]}>{statusLabels[incident.status]}</Badge>
              {incident.is_data_breach && <Badge variant="destructive">Data Breach</Badge>}
              {incident.gdpr_notification_required && <Badge variant="high">GDPR</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {incident.category_detail?.name ?? "Uncategorized"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          {canResolve && (
            <Button variant="outline" onClick={() => setResolveConfirm(true)}>
              <CheckCircle className="h-4 w-4" />
              Resolve
            </Button>
          )}
          {canClose && (
            <Button variant="outline" onClick={() => setCloseConfirm(true)}>
              <XCircle className="h-4 w-4" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Details + Timeline in two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Timeline (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Timeline
          </h2>

          {updatesLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : updates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No updates yet.
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((u, idx) => (
                <div key={u.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                      idx === updates.length - 1
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    {idx < updates.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm whitespace-pre-wrap">{u.body}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{u.created_by_detail?.full_name ?? "System"}</span>
                        <span>·</span>
                        <span title={format(new Date(u.created_at), "MMM d, yyyy HH:mm")}>
                          {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Update */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium">Add Update</h3>
            <textarea
              value={updateBody}
              onChange={(e) => setUpdateBody(e.target.value)}
              placeholder="Describe the latest development..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddUpdate}
                disabled={!updateBody.trim()}
                isLoading={createUpdate.isPending}
              >
                <Send className="h-3.5 w-3.5" />
                Post Update
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar (1/3 width) */}
        <div className="space-y-4">
          {/* Incident Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {incident.description && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
                </div>
              )}
              {incident.root_cause && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Root Cause</p>
                  <p className="text-sm whitespace-pre-wrap">{incident.root_cause}</p>
                </div>
              )}
              {incident.lessons_learned && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Lessons Learned</p>
                  <p className="text-sm whitespace-pre-wrap">{incident.lessons_learned}</p>
                </div>
              )}
              {incident.owner_detail && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Owner</span>
                  <span>{incident.owner_detail.full_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dateRow("Detected", incident.detected_at)}
              {dateRow("Reported", incident.reported_at)}
              {dateRow("Contained", incident.contained_at)}
              {dateRow("Resolved", incident.resolved_at)}
              {dateRow("Closed", incident.closed_at)}
              {timeSinceDetection !== null && (
                <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Time Since Detection</span>
                  <span className={cn("font-medium", timeSinceDetection > 72 ? "text-red-600" : timeSinceDetection > 24 ? "text-orange-600" : "text-green-600")}>
                    {timeSinceDetection}h
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GDPR / Data Breach Section */}
          {incident.is_data_breach && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                  <Shield className="h-4 w-4" />
                  Data Breach / GDPR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Notification Required</span>
                  <Badge variant={incident.gdpr_notification_required ? "high" : "inactive"}>
                    {incident.gdpr_notification_required ? "Yes" : "No"}
                  </Badge>
                </div>
                {incident.gdpr_notification_sent_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Notification Sent</span>
                    <span>{format(new Date(incident.gdpr_notification_sent_at), "MMM d, yyyy HH:mm")}</span>
                  </div>
                )}
                {incident.detected_at && !incident.gdpr_notification_sent_at && incident.gdpr_notification_required && (
                  <div className="mt-2 rounded-md bg-red-100 dark:bg-red-900/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                    <AlertTriangle className="inline h-3 w-3 mr-1" />
                    72-hour notification deadline applies. {
                      (() => {
                        const hrs = differenceInHours(new Date(), new Date(incident.detected_at));
                        const remaining = 72 - hrs;
                        return remaining > 0
                          ? `${remaining}h remaining.`
                          : `Deadline exceeded by ${Math.abs(remaining)}h.`;
                      })()
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Linked Assets */}
          {incident.assets_affected && incident.assets_affected.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {incident.assets_affected.map((a) => (
                    <Badge key={a} variant="outline">{a}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Risks */}
          {incident.risks_raised && incident.risks_raised.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Risks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {incident.risks_raised.map((r) => (
                    <Badge key={r} variant="outline">{r}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <IncidentFormModal open={editOpen} onClose={() => setEditOpen(false)} incident={incident} />

      <ConfirmDialog
        open={resolveConfirm}
        title="Resolve Incident"
        message={`Mark "${incident.title}" as resolved?`}
        onConfirm={() => resolveIncident.mutate(undefined, { onSuccess: () => setResolveConfirm(false) })}
        onCancel={() => setResolveConfirm(false)}
        confirmLabel="Resolve"
        isLoading={resolveIncident.isPending}
      />

      <ConfirmDialog
        open={closeConfirm}
        title="Close Incident"
        message={`Close "${incident.title}"? This will mark it as fully closed.`}
        onConfirm={() => closeIncident.mutate(undefined, { onSuccess: () => setCloseConfirm(false) })}
        onCancel={() => setCloseConfirm(false)}
        confirmLabel="Close Incident"
        isLoading={closeIncident.isPending}
      />
    </div>
  );
}
