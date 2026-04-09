/**
 * ModuleStatusRulesTab
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable tab content for any module page. Shows status rules that apply
 * to a specific content type and allows creating/editing rules inline.
 *
 * Usage:
 *   <ModuleStatusRulesTab contentTypeLabel="risks.risk" moduleLabel="Risk" />
 */
import { useState } from "react";
import { Plus, Play, Pencil, Trash2, Zap, Mail, Webhook, Bell } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useStatusRules,
  useDeleteStatusRule,
  useRunStatusRule,
} from "@/api/statusRules";
import {
  useAutomatedActions,
  useDeleteAutomatedAction,
  type AutomatedAction,
} from "@/api/automatedActions";
import { useContentTypes } from "@/api/automatedActions";
import { StatusRuleModal } from "./StatusRuleModal";
import { AutomatedActionModal } from "./AutomatedActionModal";

// ─── Icon map ────────────────────────────────────────────────────────────────

const ACTION_ICON: Record<string, React.ElementType> = {
  send_email: Mail,
  call_webhook: Webhook,
  create_notification: Bell,
};

const ACTION_COLOR: Record<string, string> = {
  send_email: "bg-blue-50 text-blue-700 border-blue-200",
  call_webhook: "bg-purple-50 text-purple-700 border-purple-200",
  create_notification: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Action Cards ─────────────────────────────────────────────────────────────

function ActionRow({
  action,
  onEdit,
  onDelete,
}: {
  action: AutomatedAction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = ACTION_ICON[action.action_type] ?? Zap;
  const colorClass = ACTION_COLOR[action.action_type] ?? "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2 bg-background">
      <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", colorClass)}>
        <Icon className="h-3 w-3" />
        {action.action_type_display}
      </span>
      <span className="flex-1 text-sm">{action.name}</span>
      {!action.is_active && <Badge variant="outline">Disabled</Badge>}
      {action.trigger_count > 0 && (
        <span className="text-xs text-muted-foreground">×{action.trigger_count}</span>
      )}
      <button onClick={onEdit} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onEdit,
}: {
  rule: { id: string; name: string; description: string; conditions: { field: string; operator: string; value?: string }[]; target_status: string; rule_status: string; last_run_at: string | null; last_affected_count: number };
  onEdit: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<AutomatedAction | null>(null);

  const deleteRule = useDeleteStatusRule();
  const runRule = useRunStatusRule();
  const deleteAction = useDeleteAutomatedAction();
  const { data: actions } = useAutomatedActions(rule.id);

  const OPERATOR_SYMBOLS: Record<string, string> = {
    eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤",
    in: "∈", not_in: "∉", is_null: "is empty", is_not_null: "is set",
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-border/60">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{rule.name}</span>
            <Badge variant={rule.rule_status === "active" ? "active" : "inactive"}>
              {rule.rule_status}
            </Badge>
          </div>
          {rule.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => runRule.mutate(rule.id)}
            isLoading={runRule.isPending}
            title="Run rule now"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit} title="Edit rule">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteRule.mutate(rule.id)}
            className="text-destructive hover:text-destructive"
            title="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Conditions + target */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            When
          </span>
          {rule.conditions.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-mono">
              {c.field}
              <span className="text-muted-foreground">{OPERATOR_SYMBOLS[c.operator] ?? c.operator}</span>
              {c.value && <span className="font-semibold">"{c.value}"</span>}
            </span>
          ))}
          <span className="text-xs text-muted-foreground">→ set status to</span>
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            {rule.target_status}
          </Badge>
        </div>

        {rule.last_run_at && (
          <p className="text-xs text-muted-foreground">
            Last run: {new Date(rule.last_run_at).toLocaleString()} · {rule.last_affected_count} records updated
          </p>
        )}
      </div>

      {/* Automated Actions section */}
      <div className="border-t border-border/60">
        <button
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
          onClick={() => setShowActions((v) => !v)}
        >
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Automated Actions
            {actions && actions.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-primary font-semibold">
                {actions.length}
              </span>
            )}
          </span>
          <span>{showActions ? "▲" : "▼"}</span>
        </button>

        {showActions && (
          <div className="px-4 pb-4 space-y-2">
            {(!actions || actions.length === 0) && (
              <p className="text-xs text-muted-foreground py-1">
                No automated actions configured. Add one below.
              </p>
            )}
            {actions?.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                onEdit={() => { setEditingAction(action); setActionModalOpen(true); }}
                onDelete={() => deleteAction.mutate({ id: action.id, ruleId: rule.id })}
              />
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditingAction(null); setActionModalOpen(true); }}
              className="w-full mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Action
            </Button>
          </div>
        )}
      </div>

      {actionModalOpen && (
        <AutomatedActionModal
          open={actionModalOpen}
          onClose={() => { setActionModalOpen(false); setEditingAction(null); }}
          statusRuleId={rule.id}
          editData={editingAction}
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ModuleStatusRulesTabProps {
  /** e.g. "risks.risk" — filters rules to this content type */
  contentTypeLabel: string;
  /** Human-readable module name, e.g. "Risk" */
  moduleLabel: string;
}

export function ModuleStatusRulesTab({ contentTypeLabel, moduleLabel }: ModuleStatusRulesTabProps) {
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<unknown>(null);

  const { data: contentTypes } = useContentTypes();
  const contentType = contentTypes?.find((ct) => ct.label === contentTypeLabel);

  const { data, isLoading } = useStatusRules({
    content_type: contentType?.id,
    page_size: 50,
  });
  const rules = data?.results ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">
            Status Rules for {moduleLabel}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define conditions that automatically transition {moduleLabel.toLowerCase()} statuses.
            Configure email notifications, API calls, or in-app alerts on each rule.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditingRule(null); setRuleModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-dashed border-border p-3 bg-muted/20 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Operators supported:</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {[
            ["=", "equals"], ["≠", "not equals"], [">", "greater than"], ["≥", "≥ than"],
            ["<", "less than"], ["≤", "≤ than"], ["∈", "in list"], ["∉", "not in list"],
            ["is empty", "field is null"], ["is set", "field not null"],
          ].map(([op, desc]) => (
            <span key={op}><code className="font-mono font-semibold">{op}</code> — {desc}</span>
          ))}
        </div>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No status rules for {moduleLabel} yet.
          <br />
          <button
            className="mt-2 text-primary hover:underline text-xs"
            onClick={() => setRuleModalOpen(true)}
          >
            Create the first rule →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule as Parameters<typeof RuleCard>[0]["rule"]}
              onEdit={() => { setEditingRule(rule); setRuleModalOpen(true); }}
            />
          ))}
        </div>
      )}

      {ruleModalOpen && (
        <StatusRuleModal
          open={ruleModalOpen}
          onClose={() => { setRuleModalOpen(false); setEditingRule(null); }}
          editData={editingRule as Parameters<typeof StatusRuleModal>[0]["editData"]}
          defaultContentTypeId={contentType?.id}
        />
      )}
    </div>
  );
}
