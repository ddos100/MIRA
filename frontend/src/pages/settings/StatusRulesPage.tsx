import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  useStatusRules,
  useCreateStatusRule,
  useUpdateStatusRule,
  useDeleteStatusRule,
  useRunStatusRule,
  useRunAllStatusRules,
} from "@/api/statusRules";
import type { StatusRule } from "@/api/compliance";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/utils/cn";

// ─── Condition Operators ──────────────────────────────────────────────────────

const OPERATORS = [
  { value: "eq", label: "equals (=)" },
  { value: "neq", label: "not equals (≠)" },
  { value: "gt", label: "greater than (>)" },
  { value: "gte", label: "greater than or equal (≥)" },
  { value: "lt", label: "less than (<)" },
  { value: "lte", label: "less than or equal (≤)" },
  { value: "in", label: "in list" },
  { value: "not_in", label: "not in list" },
  { value: "is_null", label: "is empty" },
  { value: "is_not_null", label: "is not empty" },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const conditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.string().min(1, "Operator is required"),
  value: z.string().optional(),
});

const ruleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  content_type: z.coerce.number().min(1, "Content type ID is required"),
  target_status: z.string().min(1, "Target status is required"),
  rule_status: z.enum(["active", "inactive"]),
  conditions: z.array(conditionSchema).min(1, "At least one condition is required"),
});
type RuleFormValues = z.infer<typeof ruleSchema>;

// ─── Form Modal ───────────────────────────────────────────────────────────────

function RuleFormModal({
  open,
  onClose,
  editData,
}: {
  open: boolean;
  onClose: () => void;
  editData?: StatusRule;
}) {
  const create = useCreateStatusRule();
  const update = useUpdateStatusRule(editData?.id ?? "");

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: editData
      ? {
          name: editData.name,
          description: editData.description ?? "",
          content_type: editData.content_type,
          target_status: editData.target_status,
          rule_status: editData.rule_status,
          conditions: editData.conditions.map((c) => ({
            field: c.field,
            operator: c.operator,
            value: c.value != null ? String(c.value) : "",
          })),
        }
      : {
          name: "",
          description: "",
          content_type: 0,
          target_status: "",
          rule_status: "active",
          conditions: [{ field: "", operator: "eq", value: "" }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });
  const watchedConditions = watch("conditions");

  const onSubmit = async (values: RuleFormValues) => {
    const payload = {
      ...values,
      conditions: values.conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value ?? null,
      })),
    };
    if (editData) {
      await update.mutateAsync(payload);
    } else {
      await create.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? "Edit Status Rule" : "New Status Rule"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Rule Name *</label>
            <Input {...register("name")} placeholder="e.g. Auto-close overdue risks" />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea {...register("description")} rows={2} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Content Type ID *
            </label>
            <Input
              type="number"
              {...register("content_type")}
              placeholder="Django ContentType PK"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Find via /admin/contenttypes/contenttype/
            </p>
            {errors.content_type && (
              <p className="mt-1 text-xs text-destructive">
                {errors.content_type.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target Status *</label>
            <Input
              {...register("target_status")}
              placeholder="e.g. closed, active, expired"
            />
            {errors.target_status && (
              <p className="mt-1 text-xs text-destructive">
                {errors.target_status.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Rule Status</label>
            <select {...register("rule_status")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Conditions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">
              Conditions *
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (ALL conditions must match)
              </span>
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ field: "", operator: "eq", value: "" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Condition
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, idx) => {
              const op = watchedConditions?.[idx]?.operator;
              const noValue = op === "is_null" || op === "is_not_null";
              return (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      {...register(`conditions.${idx}.field`)}
                      placeholder="field name (e.g. due_date)"
                    />
                  </div>
                  <div className="w-44">
                    <select {...register(`conditions.${idx}.operator`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <Input
                      {...register(`conditions.${idx}.value`)}
                      placeholder={noValue ? "—" : "value"}
                      disabled={noValue}
                      className={cn(noValue && "opacity-40")}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(idx)}
                    disabled={fields.length === 1}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
          {errors.conditions && (
            <p className="mt-1 text-xs text-destructive">
              {errors.conditions.message ?? "Check conditions above"}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {editData ? "Save Changes" : "Create Rule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onEdit,
  onDelete,
}: {
  rule: StatusRule;
  onEdit: (r: StatusRule) => void;
  onDelete: (r: StatusRule) => void;
}) {
  const runRule = useRunStatusRule();
  const [lastResult, setLastResult] = useState<number | null>(null);

  const handleRun = async () => {
    const res = await runRule.mutateAsync(rule.id);
    setLastResult(res.affected);
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{rule.name}</span>
            <Badge variant={rule.rule_status === "active" ? "active" : "inactive"}>
              {rule.rule_status}
            </Badge>
          </div>
          {rule.description && (
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
              {rule.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRun}
            disabled={runRule.isPending || rule.rule_status !== "active"}
            title="Run this rule now"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(rule)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(rule)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-1">
        {rule.conditions.map((c, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-1 mr-2 rounded bg-muted px-2 py-0.5 text-xs font-mono"
          >
            <span className="text-muted-foreground">{c.field}</span>
            <span className="text-primary">{c.operator}</span>
            {c.value != null && c.value !== "" && (
              <span>"{String(c.value)}"</span>
            )}
          </div>
        ))}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          → set status to{" "}
          <Badge variant="outline" className="text-xs">{rule.target_status}</Badge>
        </span>
      </div>

      {/* Last run info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {rule.last_run_at
            ? `Last run: ${new Date(rule.last_run_at).toLocaleString()}`
            : "Never run"}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {rule.last_affected_count ?? 0} records last affected
        </span>
        {lastResult !== null && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Just affected: {lastResult} records
          </span>
        )}
        {runRule.isError && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Run failed
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatusRulesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StatusRule | undefined>();

  const { data, isLoading } = useStatusRules();
  const rules: StatusRule[] = Array.isArray(data) ? data : [];
  const deleteRule = useDeleteStatusRule();
  const runAll = useRunAllStatusRules();
  const [runAllResult, setRunAllResult] = useState<Record<string, number> | null>(null);

  const activeRules = rules.filter((r) => r.rule_status === "active");

  const handleDelete = async (r: StatusRule) => {
    if (!confirm(`Delete rule "${r.name}"?`)) return;
    await deleteRule.mutateAsync(r.id);
  };

  const handleRunAll = async () => {
    const result = await runAll.mutateAsync();
    setRunAllResult(result);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Status Engine"
        description="Define rules that automatically transition record statuses based on field conditions. Rules run on a schedule via Celery or can be triggered manually."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRunAll}
              disabled={runAll.isPending || activeRules.length === 0}
              title="Run all active rules"
            >
              <PlayCircle className="h-4 w-4" />
              Run All Active ({activeRules.length})
            </Button>
            <Button
              onClick={() => {
                setEditTarget(undefined);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New Rule
            </Button>
          </div>
        }
      />

      {/* Run All result */}
      {runAllResult && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
          <p className="font-medium">Run completed:</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {Object.entries(runAllResult).map(([ruleId, count]) => {
              const rule = rules.find((r) => r.id === ruleId);
              return (
                <li key={ruleId}>
                  {rule?.name ?? ruleId}: {count} records affected
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{rules.length}</p>
          <p className="text-xs text-muted-foreground">Total Rules</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{activeRules.length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">
            {rules.filter((r) => r.rule_status === "inactive").length}
          </p>
          <p className="text-xs text-muted-foreground">Inactive</p>
        </div>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <PlayCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No status rules defined yet.</p>
          <p className="text-sm mt-1">
            Create a rule to automatically update record statuses based on field conditions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={(r) => {
                setEditTarget(r);
                setModalOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <RuleFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(undefined);
        }}
        editData={editTarget}
      />
    </div>
  );
}
