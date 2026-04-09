/**
 * AutomatedActionModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal for creating or editing an AutomatedAction attached to a StatusRule.
 *
 * Action types and their configs:
 *   send_email        → to, subject, body_template
 *   call_webhook      → url, method, headers (JSON), body_template (JSON)
 *   create_notification → title, body, recipient_type
 */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateAutomatedAction,
  useUpdateAutomatedAction,
  type AutomatedAction,
  type ActionType,
} from "@/api/automatedActions";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_TYPES: { value: ActionType; label: string; description: string }[] = [
  {
    value: "send_email",
    label: "Send Email",
    description: "Sends an email to one or more recipients when the rule triggers.",
  },
  {
    value: "call_webhook",
    label: "Call API / Webhook",
    description: "Makes an HTTP request to an external URL when the rule triggers.",
  },
  {
    value: "create_notification",
    label: "In-App Notification",
    description: "Creates a notification for users inside MIRA.",
  },
];

const HTTP_METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"];
const RECIPIENT_TYPES = [
  { value: "all_admins", label: "All Admins" },
  { value: "owner", label: "Record Owner" },
  { value: "all_users", label: "All Users" },
];

// ─── Schema helpers ───────────────────────────────────────────────────────────

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  is_active: z.boolean(),
  action_type: z.enum(["send_email", "call_webhook", "create_notification"]),
});

const emailSchema = baseSchema.extend({
  action_type: z.literal("send_email"),
  to: z.string().min(1, "At least one recipient required"),
  subject: z.string().min(1, "Subject is required"),
  body_template: z.string().min(1, "Body template is required"),
});

const webhookSchema = baseSchema.extend({
  action_type: z.literal("call_webhook"),
  url: z.string().url("Must be a valid URL"),
  method: z.string().min(1),
  headers: z.string().optional(),
  body_template: z.string().optional(),
});

const notificationSchema = baseSchema.extend({
  action_type: z.literal("create_notification"),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  recipient_type: z.enum(["all_admins", "owner", "all_users"]),
});

type EmailForm = z.infer<typeof emailSchema>;
type WebhookForm = z.infer<typeof webhookSchema>;
type NotificationForm = z.infer<typeof notificationSchema>;
type AnyForm = EmailForm | WebhookForm | NotificationForm;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AutomatedActionModalProps {
  open: boolean;
  onClose: () => void;
  statusRuleId: string;
  editData?: AutomatedAction | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AutomatedActionModal({
  open,
  onClose,
  statusRuleId,
  editData,
}: AutomatedActionModalProps) {
  const [actionType, setActionType] = useState<ActionType>(
    editData?.action_type ?? "send_email"
  );

  const createAction = useCreateAutomatedAction();
  const updateAction = useUpdateAutomatedAction(editData?.id ?? "");

  // ── Email form ──────────────────────────────────────────────────────────────
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      action_type: "send_email",
      name: editData?.action_type === "send_email" ? editData.name : "",
      is_active: editData?.is_active ?? true,
      to: editData?.action_type === "send_email" ? String(editData.config?.to ?? "") : "",
      subject: editData?.action_type === "send_email" ? String(editData.config?.subject ?? "") : "",
      body_template: editData?.action_type === "send_email" ? String(editData.config?.body_template ?? "") : "",
    },
  });

  // ── Webhook form ────────────────────────────────────────────────────────────
  const webhookForm = useForm<WebhookForm>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      action_type: "call_webhook",
      name: editData?.action_type === "call_webhook" ? editData.name : "",
      is_active: editData?.is_active ?? true,
      url: editData?.action_type === "call_webhook" ? String(editData.config?.url ?? "") : "",
      method: editData?.action_type === "call_webhook" ? String(editData.config?.method ?? "POST") : "POST",
      headers: editData?.action_type === "call_webhook"
        ? (editData.config?.headers ? JSON.stringify(editData.config.headers, null, 2) : "")
        : "",
      body_template: editData?.action_type === "call_webhook"
        ? (editData.config?.body_template ? JSON.stringify(editData.config.body_template, null, 2) : "")
        : "",
    },
  });

  // ── Notification form ───────────────────────────────────────────────────────
  const notifForm = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      action_type: "create_notification",
      name: editData?.action_type === "create_notification" ? editData.name : "",
      is_active: editData?.is_active ?? true,
      title: editData?.action_type === "create_notification" ? String(editData.config?.title ?? "") : "",
      body: editData?.action_type === "create_notification" ? String(editData.config?.body ?? "") : "",
      recipient_type: editData?.action_type === "create_notification"
        ? (editData.config?.recipient_type as "all_admins" | "owner" | "all_users" ?? "all_admins")
        : "all_admins",
    },
  });

  // Reset action type when editData changes
  useEffect(() => {
    if (editData?.action_type) setActionType(editData.action_type);
  }, [editData]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(values: AnyForm) {
    let config: Record<string, unknown> = {};

    if (actionType === "send_email") {
      const v = values as EmailForm;
      config = { to: v.to, subject: v.subject, body_template: v.body_template };
    } else if (actionType === "call_webhook") {
      const v = values as WebhookForm;
      let headers: unknown = {};
      let body: unknown = {};
      try { headers = v.headers ? JSON.parse(v.headers) : {}; } catch { headers = {}; }
      try { body = v.body_template ? JSON.parse(v.body_template) : {}; } catch { body = v.body_template; }
      config = { url: v.url, method: v.method, headers, body_template: body };
    } else {
      const v = values as NotificationForm;
      config = { title: v.title, body: v.body, recipient_type: v.recipient_type };
    }

    const payload = {
      status_rule: statusRuleId,
      action_type: actionType,
      name: values.name,
      is_active: values.is_active,
      config,
    };

    if (editData) {
      await updateAction.mutateAsync(payload);
    } else {
      await createAction.mutateAsync(payload);
    }
    onClose();
  }

  // ── Active form based on type ───────────────────────────────────────────────

  function submitCurrentForm() {
    if (actionType === "send_email") {
      emailForm.handleSubmit((v) => handleSubmit(v))();
    } else if (actionType === "call_webhook") {
      webhookForm.handleSubmit((v) => handleSubmit(v))();
    } else {
      notifForm.handleSubmit((v) => handleSubmit(v))();
    }
  }

  const isPending = createAction.isPending || updateAction.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? "Edit Automated Action" : "New Automated Action"}
      size="lg"
    >
      <div className="space-y-5">
        {/* Action Type Selector */}
        <div>
          <label className="mb-2 block text-sm font-medium">Action Type *</label>
          <div className="grid grid-cols-3 gap-2">
            {ACTION_TYPES.map((at) => (
              <button
                key={at.value}
                type="button"
                disabled={!!editData}
                onClick={() => setActionType(at.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  actionType === at.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-muted-foreground/50 text-foreground"
                } ${editData ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <p className="text-xs font-semibold">{at.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-tight">{at.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Common fields: Name + Active */}
        {actionType === "send_email" && (
          <CommonFields form={emailForm} />
        )}
        {actionType === "call_webhook" && (
          <CommonFields form={webhookForm} />
        )}
        {actionType === "create_notification" && (
          <CommonFields form={notifForm} />
        )}

        {/* Type-specific config */}
        {actionType === "send_email" && <EmailFields form={emailForm} />}
        {actionType === "call_webhook" && <WebhookFields form={webhookForm} />}
        {actionType === "create_notification" && <NotificationFields form={notifForm} />}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submitCurrentForm} disabled={isPending}>
            {isPending ? "Saving…" : editData ? "Save Changes" : "Create Action"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CommonFields({ form }: { form: any }) {
  const { register, formState: { errors } } = form;
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 sm:col-span-1">
        <label className="mb-1 block text-sm font-medium">Action Name *</label>
        <Input {...register("name")} placeholder="e.g. Notify risk owner" />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="flex items-end gap-2 pb-0.5">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
          <input
            type="checkbox"
            {...register("is_active")}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="font-medium">Active</span>
        </label>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EmailFields({ form }: { form: any }) {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
        Email Configuration
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium">To (recipients) *</label>
        <Textarea
          {...register("to")}
          rows={2}
          placeholder="user@example.com, another@example.com&#10;or use template variables: {{owner_email}}"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Comma-separated emails or template variables like {"{{owner_email}}"}
        </p>
        {errors.to && <p className="mt-1 text-xs text-destructive">{errors.to.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Subject *</label>
        <Input {...register("subject")} placeholder="e.g. Risk {{title}} status changed to {{status}}" />
        {errors.subject && <p className="mt-1 text-xs text-destructive">{errors.subject.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Body Template *</label>
        <Textarea
          {...register("body_template")}
          rows={5}
          placeholder="Dear team,&#10;&#10;The risk '{{title}}' has been automatically updated to status: {{status}}.&#10;&#10;Review at: {{url}}"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Use {"{{field_name}}"} for record field values, e.g. {"{{title}}"}, {"{{status}}"}, {"{{owner_email}}"}
        </p>
        {errors.body_template && <p className="mt-1 text-xs text-destructive">{errors.body_template.message}</p>}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WebhookFields({ form }: { form: any }) {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800 p-4">
      <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
        Webhook / API Configuration
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium">URL *</label>
          <Input {...register("url")} placeholder="https://api.example.com/webhook" />
          {errors.url && <p className="mt-1 text-xs text-destructive">{errors.url.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Method</label>
          <select
            {...register("method")}
            className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Headers (JSON)</label>
        <Textarea
          {...register("headers")}
          rows={3}
          placeholder={'{"Authorization": "Bearer YOUR_TOKEN", "Content-Type": "application/json"}'}
          className="font-mono text-xs"
        />
        {errors.headers && <p className="mt-1 text-xs text-destructive">{errors.headers.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Body Template (JSON)</label>
        <Textarea
          {...register("body_template")}
          rows={4}
          placeholder={'{"event": "status_change", "record_id": "{{id}}", "new_status": "{{status}}"}'}
          className="font-mono text-xs"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Use {"{{field_name}}"} placeholders for dynamic record values.
        </p>
        {errors.body_template && <p className="mt-1 text-xs text-destructive">{errors.body_template.message}</p>}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NotificationFields({ form }: { form: any }) {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
        Notification Configuration
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium">Title *</label>
        <Input {...register("title")} placeholder="e.g. Risk Status Updated: {{title}}" />
        {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Body *</label>
        <Textarea
          {...register("body")}
          rows={3}
          placeholder="Risk '{{title}}' has been automatically moved to status: {{status}}"
        />
        {errors.body && <p className="mt-1 text-xs text-destructive">{errors.body.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Recipients</label>
        <select
          {...register("recipient_type")}
          className="w-full border border-input rounded-md bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {RECIPIENT_TYPES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
