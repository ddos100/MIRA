import { useState } from "react";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useProcessingActivities,
  useCreateProcessingActivity,
  useUpdateProcessingActivity,
  useDeleteProcessingActivity,
  type ProcessingActivity,
  type ProcessingActivityParams,
  type LegalBasis,
} from "@/api/privacy";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const legalBasisLabels: Record<LegalBasis, string> = {
  consent: "Consent",
  contract: "Contract",
  legal_obligation: "Legal Obligation",
  vital_interests: "Vital Interests",
  public_task: "Public Task",
  legitimate_interests: "Legitimate Interests",
};

const legalBasisVariant: Record<LegalBasis, string> = {
  consent: "active",
  contract: "in_progress",
  legal_obligation: "pending",
  vital_interests: "high",
  public_task: "secondary",
  legitimate_interests: "outline",
};

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const activitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  controller: z.string(),
  processor: z.string(),
  purpose: z.string().min(1, "Purpose is required"),
  legal_basis: z.enum(["consent", "contract", "legal_obligation", "vital_interests", "public_task", "legitimate_interests"]),
  data_subjects: z.string(),
  personal_data_categories: z.string(),
  special_category_data: z.boolean(),
  retention_period: z.string(),
  cross_border_transfer: z.boolean(),
  transfer_safeguards: z.string(),
  is_active: z.boolean(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

// ─── Form Modal ────────────────────────────────────────────────────────────────

interface ActivityFormModalProps {
  open: boolean;
  onClose: () => void;
  activity?: ProcessingActivity;
}

function ProcessingActivityFormModal({ open, onClose, activity }: ActivityFormModalProps) {
  const create = useCreateProcessingActivity();
  const update = useUpdateProcessingActivity(activity?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: activity
      ? {
          name: activity.name,
          description: activity.description ?? "",
          controller: activity.controller ?? "",
          processor: activity.processor ?? "",
          purpose: activity.purpose,
          legal_basis: activity.legal_basis,
          data_subjects: activity.data_subjects ?? "",
          personal_data_categories: activity.personal_data_categories ?? "",
          special_category_data: activity.special_category_data,
          retention_period: activity.retention_period ?? "",
          cross_border_transfer: activity.cross_border_transfer,
          transfer_safeguards: activity.transfer_safeguards ?? "",
          is_active: activity.is_active,
        }
      : {
          name: "",
          description: "",
          controller: "",
          processor: "",
          purpose: "",
          legal_basis: "contract",
          data_subjects: "",
          personal_data_categories: "",
          special_category_data: false,
          retention_period: "",
          cross_border_transfer: false,
          transfer_safeguards: "",
          is_active: true,
        },
  });

  const isEditing = !!activity;
  const mutation = isEditing ? update : create;

  function onSubmit(values: ActivityFormValues) {
    mutation.mutate(values as Partial<ProcessingActivity>, {
      onSuccess: () => { reset(); onClose(); },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Processing Activity" : "New Processing Activity"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Activity Name *" {...register("name")} error={errors.name?.message} />
        <Textarea label="Description" rows={2} {...register("description")} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Controller" {...register("controller")} />
          <Input label="Processor" {...register("processor")} />
        </div>

        <Textarea label="Purpose *" rows={2} {...register("purpose")} error={errors.purpose?.message} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Legal Basis *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("legal_basis")}>
              {(Object.entries(legalBasisLabels) as [LegalBasis, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <Input label="Retention Period" {...register("retention_period")} />
        </div>

        <Textarea label="Data Subjects" rows={2} {...register("data_subjects")} />
        <Textarea label="Personal Data Categories" rows={2} {...register("personal_data_categories")} />
        <Textarea label="Transfer Safeguards" rows={2} {...register("transfer_safeguards")} />

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("special_category_data")} className="rounded border-input" />
            Special Category Data
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("cross_border_transfer")} className="rounded border-input" />
            Cross-Border Transfer
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("is_active")} className="rounded border-input" />
            Active
          </label>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save. Please try again.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Create Activity"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type TabKey = "all" | "special" | "crossborder";

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProcessingActivitiesPage() {
  const [params, setParams] = useState<ProcessingActivityParams>({ page: 1, page_size: 20 });
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<ProcessingActivity | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ProcessingActivity | undefined>();

  const tabParams: ProcessingActivityParams = {
    ...params,
    ...(activeTab === "special" ? { special_category_data: true } : {}),
    ...(activeTab === "crossborder" ? { cross_border_transfer: true } : {}),
  };

  const { data, isLoading, isError } = useProcessingActivities(tabParams);
  const deleteActivity = useDeleteProcessingActivity();

  const activities = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (params.page_size ?? 20));
  const currentPage = params.page ?? 1;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All Activities" },
    { key: "special", label: "Special Category" },
    { key: "crossborder", label: "Cross-Border Transfers" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Record of Processing Activities</h1>
          <p className="text-sm text-muted-foreground">Article 30 – GDPR Register of Processing Activities</p>
        </div>
        <Button onClick={() => { setEditActivity(undefined); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add Activity
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setParams((p) => ({ ...p, page: 1 })); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search activities..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-56"
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value || undefined, page: 1 }))}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setParams((p) => ({ ...p, legal_basis: (e.target.value as LegalBasis | ""), page: 1 }))}
        >
          <option value="">All Legal Bases</option>
          {(Object.entries(legalBasisLabels) as [LegalBasis, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => {
            const val = e.target.value;
            setParams((p) => ({ ...p, is_active: val === "" ? "" : val === "true", page: 1 }));
          }}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load processing activities.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Purpose</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Legal Basis</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data Subjects</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Special Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cross-Border</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No processing activities found.
                  </td>
                </tr>
              ) : (
                activities.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">{a.purpose}</td>
                    <td className="px-4 py-3">
                      <Badge variant={legalBasisVariant[a.legal_basis]}>
                        {legalBasisLabels[a.legal_basis]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[8rem] truncate text-muted-foreground">{a.data_subjects || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.special_category_data ? "high" : "inactive"}>
                        {a.special_category_data ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={a.cross_border_transfer ? "in_progress" : "inactive"}>
                        {a.cross_border_transfer ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={a.is_active ? "active" : "inactive"}>
                        {a.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditActivity(a); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(a)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {activities.length} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}>Previous</Button>
            <span className="flex h-8 items-center px-3 text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      <ProcessingActivityFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditActivity(undefined); }}
        activity={editActivity}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Processing Activity"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteActivity.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(undefined) });
        }}
        onCancel={() => setDeleteTarget(undefined)}
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteActivity.isPending}
      />
    </div>
  );
}
