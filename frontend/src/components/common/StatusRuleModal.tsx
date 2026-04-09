/**
 * StatusRuleModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable modal for creating or editing a StatusRule.
 * Accepts an optional defaultContentTypeId to pre-select the module's content type.
 */
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/utils/cn";
import { useCreateStatusRule, useUpdateStatusRule } from "@/api/statusRules";
import { useContentTypes } from "@/api/automatedActions";

// ─── Constants ────────────────────────────────────────────────────────────────

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
  content_type: z.coerce.number().min(1, "Content type is required"),
  target_status: z.string().min(1, "Target status is required"),
  rule_status: z.enum(["active", "inactive"]),
  conditions: z.array(conditionSchema).min(1, "At least one condition is required"),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface StatusRuleModalProps {
  open: boolean;
  onClose: () => void;
  editData?: {
    id: string;
    name: string;
    description?: string;
    content_type: number;
    target_status: string;
    rule_status: "active" | "inactive";
    conditions: { field: string; operator: string; value?: string | null }[];
  } | null;
  /** Pre-select content type (from module tab context) */
  defaultContentTypeId?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusRuleModal({
  open,
  onClose,
  editData,
  defaultContentTypeId,
}: StatusRuleModalProps) {
  const { data: contentTypes = [] } = useContentTypes();
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
          content_type: defaultContentTypeId ?? 0,
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
        {/* Name + Description */}
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
            <Textarea {...register("description")} rows={2} placeholder="Describe what this rule does..." />
          </div>

          {/* Content Type dropdown */}
          <div>
            <label className="mb-1 block text-sm font-medium">Module / Content Type *</label>
            <select
              {...register("content_type")}
              className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={!!defaultContentTypeId}
            >
              <option value={0}>— Select module —</option>
              {contentTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.display} ({ct.label})
                </option>
              ))}
            </select>
            {defaultContentTypeId && (
              <p className="mt-1 text-xs text-muted-foreground">
                Fixed to current module. Edit from the Status Engine settings page to change.
              </p>
            )}
            {errors.content_type && (
              <p className="mt-1 text-xs text-destructive">{errors.content_type.message}</p>
            )}
          </div>

          {/* Target Status */}
          <div>
            <label className="mb-1 block text-sm font-medium">Target Status *</label>
            <Input
              {...register("target_status")}
              placeholder="e.g. closed, active, expired"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Status value to set when all conditions match.
            </p>
            {errors.target_status && (
              <p className="mt-1 text-xs text-destructive">{errors.target_status.message}</p>
            )}
          </div>

          {/* Rule Status */}
          <div>
            <label className="mb-1 block text-sm font-medium">Rule Status</label>
            <select
              {...register("rule_status")}
              className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
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
                (ALL must match — AND logic)
              </span>
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ field: "", operator: "eq", value: "" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {fields.map((field, idx) => {
              const op = watchedConditions?.[idx]?.operator;
              const noValue = op === "is_null" || op === "is_not_null";
              return (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      {...register(`conditions.${idx}.field`)}
                      placeholder="field name (e.g. due_date, status)"
                    />
                  </div>
                  <div className="w-44 shrink-0">
                    <select
                      {...register(`conditions.${idx}.operator`)}
                      className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
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
                    className="text-destructive hover:text-destructive shrink-0"
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

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editData ? "Save Changes" : "Create Rule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
