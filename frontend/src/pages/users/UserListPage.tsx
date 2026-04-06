import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser,
  type UserDetail,
} from "@/api/auth";
import { useBusinessUnits } from "@/api/organizations";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email("Valid email required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  job_title: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "risk_manager", label: "Risk Manager" },
  { value: "risk_reviewer", label: "Risk Reviewer" },
  { value: "asset_reviewer", label: "Asset Reviewer" },
  { value: "compliance_analyst", label: "Compliance Analyst" },
  { value: "auditor", label: "Auditor" },
  { value: "audit_owner", label: "Audit Owner" },
  { value: "control_owner", label: "Control Owner" },
  { value: "evidence_owner", label: "Evidence Owner" },
  { value: "policy_owner", label: "Policy Owner" },
  { value: "policy_approver", label: "Policy Approver" },
  { value: "viewer", label: "Viewer" },
];

const roleVariant: Record<string, string> = {
  admin: "critical",
  risk_manager: "high",
  risk_reviewer: "medium",
  compliance_analyst: "partially_compliant",
  auditor: "in_progress",
  viewer: "not_assessed",
};

// ─── User Form Modal ──────────────────────────────────────────────────────────

function UserFormModal({
  open, onClose, user,
}: { open: boolean; onClose: () => void; user: UserDetail | null }) {
  const isEditing = !!user;
  const [selectedBUs, setSelectedBUs] = useState<string[]>(user?.business_units ?? []);

  const { data: buData } = useBusinessUnits({ page_size: 200 });
  const buOptions = (buData?.results ?? []).map((bu: { id: string; name: string }) => ({
    value: bu.id,
    label: bu.name,
  }));

  const createUser = useCreateUser();
  const updateUser = useUpdateUser(user?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        email: user?.email ?? "",
        first_name: user?.first_name ?? "",
        last_name: user?.last_name ?? "",
        role: user?.role ?? "viewer",
        department: user?.department ?? "",
        job_title: user?.job_title ?? "",
        phone: user?.phone ?? "",
        password: "",
      },
    });

  async function onSubmit(values: FormValues) {
    const payload: Record<string, unknown> = {
      ...values,
      business_units: selectedBUs,
    };
    if (!isEditing && !values.password) {
      delete payload.password;
    }
    if (isEditing && !values.password) {
      delete payload.password;
    }

    if (isEditing) {
      await updateUser.mutateAsync(payload);
    } else {
      await createUser.mutateAsync(payload);
    }
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit User" : "New User"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <Input
            label="Last Name"
            error={errors.last_name?.message}
            {...register("last_name")}
          />
        </div>

        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />

        {!isEditing && (
          <Input
            label="Password"
            type="password"
            placeholder="Set initial password"
            error={errors.password?.message}
            {...register("password")}
          />
        )}

        <Select
          label="Role"
          options={ROLE_OPTIONS}
          error={errors.role?.message}
          {...register("role")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Department" {...register("department")} />
          <Input label="Job Title" {...register("job_title")} />
        </div>

        <Input label="Phone" {...register("phone")} />

        <MultiSelect
          label="Business Units"
          options={buOptions}
          value={selectedBUs}
          onChange={setSelectedBUs}
          placeholder="Assign to business units…"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? "Save Changes" : "Create User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserDetail | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useUsers({ search: search || undefined, page_size: 100 });
  const deleteUser = useDeleteUser();
  const users: UserDetail[] = data?.results ?? data ?? [];

  function openCreate() {
    setEditUser(null);
    setModalOpen(true);
  }

  function openEdit(u: UserDetail) {
    setEditUser(u);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage platform users, roles, and business unit assignments."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New User
          </Button>
        }
      />

      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Department</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : users.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No users found.
                  </td>
                </tr>
              )
              : users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={(roleVariant[u.role] ?? "default") as "not_assessed"}>
                      {u.role.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.department || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete user ${u.email}?`)) deleteUser.mutate(u.id); }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditUser(null); }}
        user={editUser}
      />
    </div>
  );
}
