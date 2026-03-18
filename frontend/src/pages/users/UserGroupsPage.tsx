import { useState } from "react";
import { Plus, Pencil, Trash2, Users, UserMinus, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUserGroups, useCreateUserGroup, useUpdateUserGroup, useDeleteUserGroup,
  useAddGroupMembers, useRemoveGroupMembers,
  type UserGroup,
} from "@/api/auth";
import { useUsers } from "@/api/auth";
import { useBusinessUnits } from "@/api/organizations";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { PageHeader } from "@/components/ui/PageHeader";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  default_role: z.string().min(1, "Default role is required"),
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

// ─── Group Form Modal ─────────────────────────────────────────────────────────

function GroupFormModal({
  open, onClose, group,
}: { open: boolean; onClose: () => void; group: UserGroup | null }) {
  const isEditing = !!group;
  const [selectedBUs, setSelectedBUs] = useState<string[]>(group?.business_units ?? []);

  const { data: buData } = useBusinessUnits({ page_size: 200 });
  const buOptions = (buData?.results ?? []).map((bu: { id: string; name: string }) => ({
    value: bu.id,
    label: bu.name,
  }));

  const createGroup = useCreateUserGroup();
  const updateGroup = useUpdateUserGroup(group?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: group?.name ?? "",
        description: group?.description ?? "",
        default_role: group?.default_role ?? "viewer",
      },
    });

  async function onSubmit(values: FormValues) {
    const payload = { ...values, business_units: selectedBUs };
    if (isEditing) {
      await updateGroup.mutateAsync(payload);
    } else {
      await createGroup.mutateAsync(payload);
    }
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Group" : "New User Group"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Group Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Textarea
          label="Description"
          rows={2}
          {...register("description")}
        />
        <Select
          label="Default Role"
          options={ROLE_OPTIONS}
          error={errors.default_role?.message}
          {...register("default_role")}
        />
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
            {isEditing ? "Save Changes" : "Create Group"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Members Modal ────────────────────────────────────────────────────────────

function MembersModal({
  open, onClose, group,
}: { open: boolean; onClose: () => void; group: UserGroup }) {
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);

  const { data: usersData } = useUsers({ page_size: 200 });
  const users = usersData?.results ?? [];

  const addMembers = useAddGroupMembers(group.id);
  const removeMembers = useRemoveGroupMembers(group.id);

  const memberSet = new Set(group.member_ids ?? []);

  const nonMembers = users
    .filter((u: { id: string }) => !memberSet.has(u.id))
    .map((u: { id: string; display_name?: string; email: string }) => ({
      value: u.id,
      label: u.display_name || u.email,
    }));

  const memberUsers = users.filter((u: { id: string }) => memberSet.has(u.id));

  return (
    <Modal open={open} onClose={onClose} title={`Members — ${group.name}`} size="lg">
      <div className="space-y-5">
        {/* Current members */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Current Members ({memberUsers.length})
          </h3>
          {memberUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {memberUsers.map((u: { id: string; display_name?: string; email: string; role: string }) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 text-sm"
                >
                  <div>
                    <span className="font-medium">{u.display_name || u.email}</span>
                    <span className="text-muted-foreground text-xs ml-2">{u.role}</span>
                  </div>
                  <button
                    onClick={() => removeMembers.mutate([u.id])}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Remove from group"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add members */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Add Members
          </h3>
          <MultiSelect
            options={nonMembers}
            value={selectedToAdd}
            onChange={setSelectedToAdd}
            placeholder="Select users to add…"
          />
          <Button
            size="sm"
            disabled={selectedToAdd.length === 0}
            isLoading={addMembers.isPending}
            onClick={() => addMembers.mutate(selectedToAdd, { onSuccess: () => setSelectedToAdd([]) })}
          >
            <UserPlus className="h-4 w-4" /> Add Selected
          </Button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserGroupsPage() {
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<UserGroup | null>(null);
  const [membersGroup, setMembersGroup] = useState<UserGroup | null>(null);

  const { data, isLoading } = useUserGroups();
  const deleteGroup = useDeleteUserGroup();
  const groups: UserGroup[] = data?.results ?? data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Groups"
        description="Organize users into groups with shared roles and business unit access."
        actions={
          <Button onClick={() => { setEditGroup(null); setGroupModalOpen(true); }}>
            <Plus className="h-4 w-4" /> New Group
          </Button>
        }
      />

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Group Name</th>
              <th className="text-left px-4 py-3 font-medium">Default Role</th>
              <th className="text-left px-4 py-3 font-medium">Members</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 w-28" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : groups.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No user groups yet.
                  </td>
                </tr>
              )
              : groups.map((g) => (
                <tr key={g.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {g.default_role.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setMembersGroup(g)}
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {g.member_count ?? 0}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                    {g.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditGroup(g); setGroupModalOpen(true); }}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete group "${g.name}"?`)) deleteGroup.mutate(g.id); }}
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

      <GroupFormModal
        open={groupModalOpen}
        onClose={() => { setGroupModalOpen(false); setEditGroup(null); }}
        group={editGroup}
      />

      {membersGroup && (
        <MembersModal
          open={!!membersGroup}
          onClose={() => setMembersGroup(null)}
          group={membersGroup}
        />
      )}
    </div>
  );
}
