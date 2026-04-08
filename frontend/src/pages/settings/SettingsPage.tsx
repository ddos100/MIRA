import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ClipboardList, Key, Lock, Plus, Trash2, User, Webhook, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/cn";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  department: z.string().optional(),
  job_title: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  timezone: z.string().optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  old_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "profile" | "security" | "api-keys" | "audit-log" | "webhooks" | "organization" | "status-rules";

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const qc = useQueryClient();
  const setUser = useAuthStore(s => s.setUser);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/auth/me/").then(r => r.data),
  });

  const update = useMutation({
    mutationFn: (data: ProfileFormValues) => apiClient.patch("/auth/me/", data).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setUser(data);
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } =
    useForm<ProfileFormValues>({
      resolver: zodResolver(profileSchema),
      values: me
        ? {
            first_name: me.first_name ?? "",
            last_name: me.last_name ?? "",
            department: me.department ?? "",
            job_title: me.job_title ?? "",
            phone: me.phone ?? "",
            bio: me.bio ?? "",
            timezone: me.timezone ?? "",
          }
        : undefined,
    });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(data => update.mutate(data))} className="space-y-4 max-w-xl">
      {update.isSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Profile updated successfully.
        </div>
      )}
      {update.isError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          Failed to update profile. Please try again.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name *" error={errors.first_name?.message} {...register("first_name")} />
        <Input label="Last Name *" error={errors.last_name?.message} {...register("last_name")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Department" {...register("department")} />
        <Input label="Job Title" {...register("job_title")} />
      </div>

      <Input label="Phone" type="tel" {...register("phone")} />

      <div>
        <label className="text-sm font-medium text-foreground block mb-1">Bio</label>
        <textarea
          {...register("bio")}
          rows={3}
          placeholder="A short bio about yourself..."
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <Input label="Timezone" placeholder="e.g. America/New_York" {...register("timezone")} />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" isLoading={isSubmitting || update.isPending} disabled={!isDirty}>
          Save Changes
        </Button>
        {me && (
          <span className="text-sm text-muted-foreground">
            Email: <span className="font-medium text-foreground">{me.email}</span>
            {me.role && (
              <span className="ml-2 capitalize">· {me.role.replace("_", " ")}</span>
            )}
          </span>
        )}
      </div>
    </form>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [success, setSuccess] = useState(false);

  const changePassword = useMutation({
    mutationFn: (data: { old_password: string; new_password: string }) =>
      apiClient.post("/auth/me/change-password/", data).then(r => r.data),
    onSuccess: () => { setSuccess(true); reset(); },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PasswordFormValues>({
      resolver: zodResolver(passwordSchema),
      defaultValues: { old_password: "", new_password: "", confirm_password: "" },
    });

  function onSubmit({ old_password, new_password }: PasswordFormValues) {
    setSuccess(false);
    changePassword.mutate({ old_password, new_password });
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1">Change Password</h3>
        <p className="text-sm text-muted-foreground">Update your account password.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            Password changed successfully.
          </div>
        )}
        {changePassword.isError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            Failed to change password. Check your current password and try again.
          </div>
        )}

        <Input
          label="Current Password"
          type="password"
          error={errors.old_password?.message}
          {...register("old_password")}
        />
        <Input
          label="New Password"
          type="password"
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        <Input
          label="Confirm New Password"
          type="password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />
        <Button type="submit" isLoading={isSubmitting || changePassword.isPending}>
          Change Password
        </Button>
      </form>
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at?: string | null;
}

function APIKeysTab() {
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const { data: keysData, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiClient.get("/auth/api-keys/").then(r => r.data),
  });
  const keys: APIKey[] = keysData?.results ?? keysData ?? [];

  const createKey = useMutation({
    mutationFn: (name: string) => apiClient.post("/auth/api-keys/", { name }).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKeyValue(data.key ?? data.token ?? null);
      setNewKeyName("");
    },
  });

  const deleteKey = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/auth/api-keys/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1">API Keys</h3>
        <p className="text-sm text-muted-foreground">Manage personal API keys for programmatic access.</p>
      </div>

      {/* Create new key */}
      <div className="flex gap-3">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g. CI Pipeline)"
          className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          onClick={() => { if (newKeyName.trim()) createKey.mutate(newKeyName.trim()); }}
          isLoading={createKey.isPending}
          disabled={!newKeyName.trim()}
        >
          Generate Key
        </Button>
      </div>

      {/* New key value banner */}
      {newKeyValue && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 space-y-2">
          <p className="text-sm font-medium text-yellow-800">
            Save this key — it won't be shown again.
          </p>
          <code className="block text-xs bg-yellow-100 rounded p-2 break-all select-all">
            {newKeyValue}
          </code>
          <Button size="sm" variant="outline" onClick={() => setNewKeyValue(null)}>Dismiss</Button>
        </div>
      )}

      {/* Keys list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
        </div>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No API keys yet.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prefix</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Used</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{key.prefix}…</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm(`Revoke key "${key.name}"?`)) deleteKey.mutate(key.id); }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Webhooks Tab ──────────────────────────────────────────────────────────────

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_delivery_at: string | null;
  created_at: string;
}

const webhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  events: z.string().optional(),
  secret: z.string().optional(),
  is_active: z.boolean().default(true),
});
type WebhookFormValues = z.infer<typeof webhookSchema>;

function WebhooksTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: webhooks = [], isLoading } = useQuery<WebhookItem[]>({
    queryKey: ["webhooks"],
    queryFn: () =>
      apiClient.get("/core/webhooks/").then((r) => r.data.results ?? r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<WebhookFormValues>({ resolver: zodResolver(webhookSchema) });

  const create = useMutation({
    mutationFn: (values: WebhookFormValues) => {
      const payload = {
        ...values,
        events: values.events
          ? values.events.split(",").map((e) => e.trim()).filter(Boolean)
          : [],
      };
      return apiClient.post("/core/webhooks/", payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      reset();
      setShowForm(false);
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/core/webhooks/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const testWebhook = useMutation({
    mutationFn: (id: string) => apiClient.post(`/core/webhooks/${id}/test/`),
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold mb-1">Outbound Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            Send real-time events to external systems (SIEM, ticketing, Slack).
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus size={14} />
          Add Webhook
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((v) => create.mutate(v))}
          className="border rounded-xl p-4 space-y-3 bg-muted/20"
        >
          <h4 className="font-medium text-sm">New Webhook</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Name</label>
              <input {...register("name")} className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="My SIEM" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">URL</label>
              <input {...register("url")} className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://hooks.example.com/…" />
              {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Events (comma-separated, or * for all)</label>
              <input {...register("events")} className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="risk.created, incident.created" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Secret (HMAC-SHA256)</label>
              <input {...register("secret")} type="password" className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Optional signing secret" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={create.isPending} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {create.isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="border rounded-xl bg-card p-10 text-center text-sm text-muted-foreground">
          <Webhook className="mx-auto mb-3 text-gray-300" size={36} />
          No webhooks configured yet.
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">URL</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Events</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Delivery</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {webhooks.map((wh) => (
                <tr key={wh.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{wh.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-xs truncate">{wh.url}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {wh.events?.length ? wh.events.slice(0, 3).join(", ") + (wh.events.length > 3 ? "…" : "") : "*"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", wh.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600")}>
                      {wh.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {wh.last_delivery_at ? new Date(wh.last_delivery_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => testWebhook.mutate(wh.id)}
                        disabled={testWebhook.isPending}
                        title="Send test ping"
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        <Zap size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete webhook "${wh.name}"?`)) deleteWebhook.mutate(wh.id); }}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Audit Log Tab ─────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string | null;
  user_name: string;
  action: string;
  object_repr: string;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  login: "Logged In",
  logout: "Logged Out",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-purple-100 text-purple-800",
  logout: "bg-gray-100 text-gray-700",
};

function AuditLogTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-log", page, search],
    queryFn: () =>
      apiClient
        .get("/core/audit-log/", {
          params: { page, page_size: pageSize, search: search || undefined },
        })
        .then(r => r.data),
  });

  const entries: AuditLogEntry[] = data?.results ?? [];
  const totalCount: number = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h3 className="text-base font-semibold mb-1">Audit Log</h3>
        <p className="text-sm text-muted-foreground">
          System-wide record of all create, update, and delete actions.
        </p>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search by user or object…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="border rounded-md px-3 py-2 text-sm w-72 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load audit log.
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          No audit log entries found.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Object</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {entry.user_name || "System"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-700"
                      )}
                    >
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {entry.object_repr}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {entry.ip_address ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of{" "}
            {totalCount} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-accent"
            >
              Previous
            </button>
            <span className="px-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-accent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Organization Tab ─────────────────────────────────────────────────────────

const orgSettingsSchema = z.object({
  org_name: z.string().min(1, "Organisation name is required"),
  description: z.string().optional(),
  timezone: z.string().optional(),
  primary_contact_email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  max_risk_score: z.number().min(1).max(1000),
  risk_review_days: z.number().min(1).max(3650),
  policy_review_days: z.number().min(1).max(3650),
  enable_2fa_required: z.boolean(),
});
type OrgFormValues = z.infer<typeof orgSettingsSchema>;

function OrganizationTab() {
  const qc = useQueryClient();

  const { data: orgSettings, isLoading } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => apiClient.get("/organizations/settings/").then((r) => r.data),
  });

  const update = useMutation({
    mutationFn: (data: Partial<OrgFormValues>) =>
      apiClient.patch("/organizations/settings/", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-settings"] }),
  });

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } =
    useForm<OrgFormValues>({
      resolver: zodResolver(orgSettingsSchema),
      values: orgSettings
        ? {
            org_name: orgSettings.org_name ?? "MIRA GRC",
            description: orgSettings.description ?? "",
            timezone: orgSettings.timezone ?? "UTC",
            primary_contact_email: orgSettings.primary_contact_email ?? "",
            max_risk_score: orgSettings.max_risk_score ?? 25,
            risk_review_days: orgSettings.risk_review_days ?? 90,
            policy_review_days: orgSettings.policy_review_days ?? 365,
            enable_2fa_required: orgSettings.enable_2fa_required ?? false,
          }
        : undefined,
    });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((data) => update.mutate(data))} className="space-y-6 max-w-2xl">
      {update.isSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Organisation settings saved.
        </div>
      )}
      {update.isError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          Failed to save settings. Please try again.
        </div>
      )}

      {/* General */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">General</h3>
        <Input label="Organisation Name *" error={errors.org_name?.message} {...register("org_name")} />

        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Description</label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Short description of your organisation..."
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Timezone" placeholder="e.g. Europe/London" {...register("timezone")} />
          <Input
            label="Primary Contact Email"
            type="email"
            placeholder="security@example.com"
            error={errors.primary_contact_email?.message}
            {...register("primary_contact_email")}
          />
        </div>
      </div>

      {/* Risk & Review Defaults */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Risk & Review Defaults</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Max Risk Score</label>
            <input
              type="number"
              min={1}
              max={1000}
              {...register("max_risk_score", { valueAsNumber: true })}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.max_risk_score && (
              <p className="text-xs text-destructive mt-1">{errors.max_risk_score.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Risk Review (days)</label>
            <input
              type="number"
              min={1}
              max={3650}
              {...register("risk_review_days", { valueAsNumber: true })}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.risk_review_days && (
              <p className="text-xs text-destructive mt-1">{errors.risk_review_days.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Policy Review (days)</label>
            <input
              type="number"
              min={1}
              max={3650}
              {...register("policy_review_days", { valueAsNumber: true })}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.policy_review_days && (
              <p className="text-xs text-destructive mt-1">{errors.policy_review_days.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Security</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("enable_2fa_required")}
            className="rounded border-gray-300"
          />
          <span className="text-sm">
            Require two-factor authentication for all users
          </span>
        </label>
      </div>

      <div className="pt-2">
        <Button type="submit" isLoading={isSubmitting || update.isPending} disabled={!isDirty}>
          Save Settings
        </Button>
      </div>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "audit-log", label: "Audit Log", icon: ClipboardList },
  { id: "organization", label: "Organisation", icon: Building2 },
  { id: "status-rules", label: "Status Engine", icon: Zap },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const navigate = useNavigate();

  // Status Engine tab navigates to its own page rather than rendering inline
  function handleTabClick(id: Tab) {
    if (id === "status-rules") {
      navigate("/settings/status-rules");
    } else {
      setTab(id);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and security preferences.</p>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === "profile" && <ProfileTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "api-keys" && <APIKeysTab />}
        {tab === "webhooks" && <WebhooksTab />}
        {tab === "audit-log" && <AuditLogTab />}
        {tab === "organization" && <OrganizationTab />}
      </div>
    </div>
  );
}
