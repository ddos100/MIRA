import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert, CheckSquare, Lock, AlertTriangle, XCircle,
  FileText, Users, BookOpen, GitBranch, ClipboardCheck,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { apiClient } from "@/api/client";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  icon: React.ElementType;
  color: string;
  endpoints: { key: string; label: string; params?: Record<string, string> }[];
}

interface CountResult {
  label: string;
  value: number;
  params?: Record<string, string>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCount(endpoint: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: ["report-count", endpoint, params],
    queryFn: () => apiClient.get(endpoint, { params: { page_size: 1, ...params } }).then(r => r.data?.count ?? 0),
    staleTime: 30_000,
  });
}

// ─── Module Card ──────────────────────────────────────────────────────────────

interface ModuleCardProps {
  label: string;
  icon: React.ElementType;
  color: string;
  counts: CountResult[];
  isLoading?: boolean;
}

function ModuleCard({ label, icon: Icon, color, counts, isLoading }: ModuleCardProps) {
  const total = counts.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sm">{label}</span>
        {isLoading ? (
          <span className="ml-auto text-muted-foreground text-sm">…</span>
        ) : (
          <span className="ml-auto text-2xl font-bold">{total}</span>
        )}
      </div>
      <div className="space-y-1">
        {counts.map((c) => (
          <div key={c.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{c.label}</span>
            {isLoading ? (
              <div className="h-3 w-6 bg-muted animate-pulse rounded" />
            ) : (
              <span className="font-medium">{c.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Risk Breakdown Section ───────────────────────────────────────────────────

function RiskBreakdown() {
  const { data: openCount = 0, isLoading: l1 } = useCount("/risks/risks/", { status: "open" });
  const { data: inTreatmentCount = 0, isLoading: l2 } = useCount("/risks/risks/", { status: "in_treatment" });
  const { data: closedCount = 0, isLoading: l3 } = useCount("/risks/risks/", { status: "closed" });
  const { data: criticalCount = 0, isLoading: l4 } = useCount("/risks/risks/", { inherent_risk: "critical" });
  const { data: highCount = 0, isLoading: l5 } = useCount("/risks/risks/", { inherent_risk: "high" });

  const isLoading = l1 || l2 || l3 || l4 || l5;

  return (
    <ModuleCard
      label="Risks"
      icon={ShieldAlert}
      color="bg-red-500"
      isLoading={isLoading}
      counts={[
        { label: "Open", value: openCount as number },
        { label: "In Treatment", value: inTreatmentCount as number },
        { label: "Closed", value: closedCount as number },
        { label: "Critical", value: criticalCount as number },
        { label: "High", value: highCount as number },
      ]}
    />
  );
}

function ComplianceBreakdown() {
  const { data: programs = 0, isLoading: l1 } = useCount("/compliance/programs/");
  const { data: compliant = 0, isLoading: l2 } = useCount("/compliance/programs/", { status: "compliant" });
  const { data: nonCompliant = 0, isLoading: l3 } = useCount("/compliance/programs/", { status: "non_compliant" });

  return (
    <ModuleCard
      label="Compliance"
      icon={CheckSquare}
      color="bg-blue-500"
      isLoading={l1 || l2 || l3}
      counts={[
        { label: "Programs", value: programs as number },
        { label: "Compliant", value: compliant as number },
        { label: "Non-Compliant", value: nonCompliant as number },
      ]}
    />
  );
}

function ControlBreakdown() {
  const { data: total = 0, isLoading: l1 } = useCount("/controls/controls/");
  const { data: active = 0, isLoading: l2 } = useCount("/controls/controls/", { status: "active" });
  const { data: tests = 0, isLoading: l3 } = useCount("/controls/control-tests/");
  const { data: issues = 0, isLoading: l4 } = useCount("/controls/control-issues/", { status: "open" });

  return (
    <ModuleCard
      label="Controls"
      icon={Lock}
      color="bg-green-600"
      isLoading={l1 || l2 || l3 || l4}
      counts={[
        { label: "Total Controls", value: total as number },
        { label: "Active", value: active as number },
        { label: "Tests Recorded", value: tests as number },
        { label: "Open Issues", value: issues as number },
      ]}
    />
  );
}

function IncidentBreakdown() {
  const { data: open = 0, isLoading: l1 } = useCount("/incidents/incidents/", { status: "new" });
  const { data: investigating = 0, isLoading: l2 } = useCount("/incidents/incidents/", { status: "investigating" });
  const { data: resolved = 0, isLoading: l3 } = useCount("/incidents/incidents/", { status: "resolved" });

  return (
    <ModuleCard
      label="Incidents"
      icon={AlertTriangle}
      color="bg-orange-500"
      isLoading={l1 || l2 || l3}
      counts={[
        { label: "New / Open", value: open as number },
        { label: "Investigating", value: investigating as number },
        { label: "Resolved", value: resolved as number },
      ]}
    />
  );
}

function ExceptionsBreakdown() {
  const { data: pending = 0, isLoading: l1 } = useCount("/exceptions/exceptions/", { status: "pending" });
  const { data: approved = 0, isLoading: l2 } = useCount("/exceptions/exceptions/", { status: "approved" });
  const { data: expired = 0, isLoading: l3 } = useCount("/exceptions/exceptions/", { status: "expired" });

  return (
    <ModuleCard
      label="Exceptions"
      icon={XCircle}
      color="bg-purple-500"
      isLoading={l1 || l2 || l3}
      counts={[
        { label: "Pending", value: pending as number },
        { label: "Approved", value: approved as number },
        { label: "Expired", value: expired as number },
      ]}
    />
  );
}

function PolicyBreakdown() {
  const { data: total = 0, isLoading: l1 } = useCount("/policies/policies/");
  const { data: approved = 0, isLoading: l2 } = useCount("/policies/policies/", { status: "approved" });
  const { data: draft = 0, isLoading: l3 } = useCount("/policies/policies/", { status: "draft" });

  return (
    <ModuleCard
      label="Policies"
      icon={FileText}
      color="bg-indigo-500"
      isLoading={l1 || l2 || l3}
      counts={[
        { label: "Total", value: total as number },
        { label: "Approved", value: approved as number },
        { label: "Draft", value: draft as number },
      ]}
    />
  );
}

function VendorBreakdown() {
  const { data: total = 0, isLoading: l1 } = useCount("/third-parties/third-parties/");
  const { data: active = 0, isLoading: l2 } = useCount("/third-parties/third-parties/", { is_active: "true" });
  const { data: tier1 = 0, isLoading: l3 } = useCount("/third-parties/third-parties/", { risk_tier: "tier1" });

  return (
    <ModuleCard
      label="Vendors"
      icon={Users}
      color="bg-teal-500"
      isLoading={l1 || l2 || l3}
      counts={[
        { label: "Total", value: total as number },
        { label: "Active", value: active as number },
        { label: "Tier 1 (Critical)", value: tier1 as number },
      ]}
    />
  );
}

function AwarenessBreakdown() {
  const { data: programs = 0, isLoading: l1 } = useCount("/awareness/awareness-programs/");
  const { data: assignments = 0, isLoading: l2 } = useCount("/awareness/awareness-assignments/");

  return (
    <ModuleCard
      label="Awareness"
      icon={BookOpen}
      color="bg-yellow-500"
      isLoading={l1 || l2}
      counts={[
        { label: "Programs", value: programs as number },
        { label: "Assignments", value: assignments as number },
      ]}
    />
  );
}

function ContinuityBreakdown() {
  const { data: plans = 0, isLoading: l1 } = useCount("/continuity/continuity-plans/");
  const { data: approved = 0, isLoading: l2 } = useCount("/continuity/continuity-plans/", { status: "approved" });
  const { data: tests = 0, isLoading: l3 } = useCount("/continuity/continuity-tests/");

  return (
    <ModuleCard
      label="Business Continuity"
      icon={GitBranch}
      color="bg-cyan-500"
      isLoading={l1 || l2 || l3}
      counts={[
        { label: "Plans", value: plans as number },
        { label: "Approved", value: approved as number },
        { label: "Tests", value: tests as number },
      ]}
    />
  );
}

function AssessmentsBreakdown() {
  const { data: templates = 0, isLoading: l1 } = useCount("/assessments/assessment-templates/");
  const { data: sent = 0, isLoading: l2 } = useCount("/assessments/assessments/", { status: "sent" });
  const { data: completed = 0, isLoading: l3 } = useCount("/assessments/assessments/", { status: "completed" });

  return (
    <ModuleCard
      label="Assessments"
      icon={ClipboardCheck}
      color="bg-pink-500"
      isLoading={l1 || l2 || l3}
      counts={[
        { label: "Templates", value: templates as number },
        { label: "Sent", value: sent as number },
        { label: "Completed", value: completed as number },
      ]}
    />
  );
}

// ─── Top-level KPI bar ────────────────────────────────────────────────────────

function KPIBar() {
  const { data: openRisks = 0 } = useCount("/risks/risks/", { status: "open" });
  const { data: openIncidents = 0 } = useCount("/incidents/incidents/", { status: "new" });
  const { data: openIssues = 0 } = useCount("/controls/control-issues/", { status: "open" });
  const { data: pendingExceptions = 0 } = useCount("/exceptions/exceptions/", { status: "pending" });

  const kpis = [
    { label: "Open Risks", value: openRisks as number, icon: ShieldAlert, threshold: 10 },
    { label: "Open Incidents", value: openIncidents as number, icon: AlertTriangle, threshold: 5 },
    { label: "Control Issues", value: openIssues as number, icon: Lock, threshold: 10 },
    { label: "Pending Exceptions", value: pendingExceptions as number, icon: XCircle, threshold: 3 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isHigh = kpi.value >= kpi.threshold;
        const isMed = kpi.value >= Math.floor(kpi.threshold / 2);
        const TrendIcon = isHigh ? TrendingUp : isMed ? Minus : TrendingDown;
        const trendColor = isHigh ? "text-red-600" : isMed ? "text-yellow-600" : "text-green-600";

        return (
          <div key={kpi.label} className="bg-card border rounded-lg p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", isHigh ? "bg-red-100" : isMed ? "bg-yellow-100" : "bg-green-100")}>
              <Icon className={cn("h-5 w-5", isHigh ? "text-red-600" : isMed ? "text-yellow-600" : "text-green-600")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
            <TrendIcon className={cn("h-4 w-4 shrink-0", trendColor)} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GRC Reports</h1>
        <p className="text-muted-foreground">Real-time overview of your GRC program health.</p>
      </div>

      <KPIBar />

      <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
        Module Summary
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <RiskBreakdown />
        <ComplianceBreakdown />
        <ControlBreakdown />
        <IncidentBreakdown />
        <ExceptionsBreakdown />
        <PolicyBreakdown />
        <VendorBreakdown />
        <AwarenessBreakdown />
        <ContinuityBreakdown />
        <AssessmentsBreakdown />
      </div>
    </div>
  );
}
