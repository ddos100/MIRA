import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Lock, Key, Shield } from "lucide-react";
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

type Tab = "profile" | "security" | "api-keys";

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

// ─── Main Page ─────────────────────────────────────────────────────────────────

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "api-keys", label: "API Keys", icon: Key },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

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
            onClick={() => setTab(id)}
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
      </div>
    </div>
  );
}
