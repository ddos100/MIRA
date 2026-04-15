import { useState } from "react";
import { Plus, Pencil, Trash2, FileText, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import {
  useProcessingActivities,
  useCreateProcessingActivity,
  useUpdateProcessingActivity,
  useDeleteProcessingActivity,
  type ProcessingActivity,
  type ProcessingActivityParams,
  type LegalBasis,
} from "@/api/privacy";
import { useDataFlows, type DataFlow } from "@/api/assets";
import { useUsers, type UserDetail } from "@/api/auth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

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
  name:                    z.string().min(1, "Name is required"),
  description:             z.string(),
  controller:              z.string(),
  processor:               z.string(),
  purpose:                 z.string().min(1, "Purpose is required"),
  legal_basis:             z.enum(["consent","contract","legal_obligation","vital_interests","public_task","legitimate_interests"]),
  data_subjects:           z.string(),
  personal_data_categories:z.string(),
  special_category_data:   z.boolean(),
  retention_period:        z.string(),
  cross_border_transfer:   z.boolean(),
  transfer_safeguards:     z.string(),
  owner:                   z.string().nullable(),
  is_active:               z.boolean(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

// ─── Form Modal ────────────────────────────────────────────────────────────────

function ProcessingActivityFormModal({ open, onClose, activity }: { open: boolean; onClose: () => void; activity?: ProcessingActivity }) {
  const create = useCreateProcessingActivity();
  const update = useUpdateProcessingActivity(activity?.id ?? "");
  const { data: usersData } = useUsers({ page_size: 200 });
  const users = usersData?.results ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: activity ? {
      name:                     activity.name,
      description:              activity.description ?? "",
      controller:               activity.controller ?? "",
      processor:                activity.processor ?? "",
      purpose:                  activity.purpose,
      legal_basis:              activity.legal_basis,
      data_subjects:            activity.data_subjects ?? "",
      personal_data_categories: activity.personal_data_categories ?? "",
      special_category_data:    activity.special_category_data,
      retention_period:         activity.retention_period ?? "",
      cross_border_transfer:    activity.cross_border_transfer,
      transfer_safeguards:      activity.transfer_safeguards ?? "",
      owner:                    activity.owner ?? null,
      is_active:                activity.is_active,
    } : {
      name: "", description: "", controller: "", processor: "", purpose: "",
      legal_basis: "contract", data_subjects: "", personal_data_categories: "",
      special_category_data: false, retention_period: "", cross_border_transfer: false,
      transfer_safeguards: "", owner: null, is_active: true,
    },
  });

  const isEditing = !!activity;
  const mutation  = isEditing ? update : create;

  const sel = "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
            <select className={sel} {...register("legal_basis")}>
              {(Object.entries(legalBasisLabels) as [LegalBasis, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <Input label="Retention Period" placeholder="e.g. 365 days" {...register("retention_period")} />
        </div>

        <Textarea label="Data Subjects" rows={2} placeholder="e.g. Employees, Customers" {...register("data_subjects")} />
        <Textarea label="Personal Data Categories" rows={2} placeholder="e.g. Name, Email, Location" {...register("personal_data_categories")} />
        <Textarea label="Transfer Safeguards" rows={2} placeholder="SCCs, Adequacy Decision, BCR…" {...register("transfer_safeguards")} />

        <div>
          <label className="text-sm font-medium text-foreground">Owner</label>
          <select className={sel} {...register("owner")}>
            <option value="">— None —</option>
            {users.map((u: UserDetail) => (
              <option key={u.id} value={u.id}>
                {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("special_category_data")} className="rounded border-input" />
            Special Category Data (Art. 9)
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

// ─── Linked DataFlows panel (loaded lazily per expanded row) ─────────────────

function LinkedDataFlows({ activityId }: { activityId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useDataFlows({ processing_activity: activityId } as Record<string, unknown>);
  const flows: DataFlow[] = data?.results ?? [];

  if (isLoading) return <LoadingSpinner />;
  if (flows.length === 0) return <p className="text-xs text-muted-foreground">No data flows linked to this activity.</p>;

  return (
    <div className="space-y-2">
      {flows.map(f => (
        <button key={f.id}
          onClick={() => navigate(`/assets/flows/${f.id}`)}
          className="w-full text-left rounded border bg-background p-3 hover:bg-muted/40 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm">{f.name}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {f.source_asset_name} → {f.destination_asset_name}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {f.data_types           && <span><span className="font-medium">Data Types:</span> {f.data_types}</span>}
            {f.legal_basis          && <span><span className="font-medium">Legal Basis:</span> {f.legal_basis}</span>}
            {f.data_subject_categories && <span><span className="font-medium">Data Subjects:</span> {f.data_subject_categories}</span>}
            {f.personal_data_categories && <span><span className="font-medium">Personal Data:</span> {f.personal_data_categories}</span>}
            {f.retention_period_days != null && <span><span className="font-medium">Retention:</span> {f.retention_period_days} days</span>}
            {f.transfer_mechanism   && <span><span className="font-medium">Mechanism:</span> {f.transfer_mechanism}</span>}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {f.lifecycle_stage      && <span className="capitalize text-xs bg-muted rounded px-1.5 py-0.5">{f.lifecycle_stage_display ?? f.lifecycle_stage}</span>}
            {f.is_cross_border      && <Badge variant="high">Cross-Border</Badge>}
            {f.special_category_data && <Badge variant="critical">Special Cat.</Badge>}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type TabKey = "all" | "special" | "crossborder";

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProcessingActivitiesPage() {
  const [params,        setParams]        = useState<ProcessingActivityParams>({ page: 1, page_size: 20 });
  const [activeTab,     setActiveTab]     = useState<TabKey>("all");
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editActivity,  setEditActivity]  = useState<ProcessingActivity | undefined>();
  const [deleteTarget,  setDeleteTarget]  = useState<ProcessingActivity | undefined>();
  const [expandedId,    setExpandedId]    = useState<string | null>(null);

  const tabParams: ProcessingActivityParams = {
    ...params,
    ...(activeTab === "special"     ? { special_category_data: true }  : {}),
    ...(activeTab === "crossborder" ? { cross_border_transfer: true }  : {}),
  };

  const { data, isLoading, isError } = useProcessingActivities(tabParams);
  const deleteActivity = useDeleteProcessingActivity();

  const activities  = data?.results ?? [];
  const total       = data?.count ?? 0;
  const totalPages  = Math.ceil(total / (params.page_size ?? 20));
  const currentPage = params.page ?? 1;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all",         label: "All Activities" },
    { key: "special",     label: "Special Category" },
    { key: "crossborder", label: "Cross-Border Transfers" },
  ];

  const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Record of Processing Activities</h1>
          <p className="text-sm text-muted-foreground">Article 30 – GDPR Register of Processing Activities</p>
        </div>
        <Button onClick={() => { setEditActivity(undefined); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Activity
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => { setActiveTab(tab.key); setParams(p => ({ ...p, page: 1 })); }}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="search" placeholder="Search activities…"
          className={cn(sel, "w-56")}
          onChange={e => setParams(p => ({ ...p, search: e.target.value || undefined, page: 1 }))} />
        <select className={sel}
          onChange={e => setParams(p => ({ ...p, legal_basis: (e.target.value as LegalBasis | ""), page: 1 }))}>
          <option value="">All Legal Bases</option>
          {(Object.entries(legalBasisLabels) as [LegalBasis, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select className={sel}
          onChange={e => {
            const v = e.target.value;
            setParams(p => ({ ...p, is_active: v === "" ? "" : v === "true", page: 1 }));
          }}>
          <option value="">All Statuses</option>
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
        <div className="rounded-lg border bg-card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Controller / Processor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Purpose</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Legal Basis</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Retention</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Flags</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No processing activities found.
                  </td>
                </tr>
              ) : activities.map(a => {
                const isOpen = expandedId === a.id;
                return (
                  <>
                    <tr key={a.id}
                      className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isOpen ? null : a.id)}>
                      <td className="w-8 px-2 py-3 text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{a.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {a.controller && <div><span className="font-medium">C:</span> {a.controller}</div>}
                        {a.processor  && <div><span className="font-medium">P:</span> {a.processor}</div>}
                        {!a.controller && !a.processor && "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground">{a.purpose || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={legalBasisVariant[a.legal_basis]}>
                          {legalBasisLabels[a.legal_basis]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {a.owner_detail?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {a.retention_period || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.special_category_data  && <Badge variant="high">Special Cat.</Badge>}
                          {a.cross_border_transfer   && <Badge variant="in_progress">Cross-Border</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={a.is_active ? "active" : "inactive"}>
                          {a.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost"
                            onClick={() => { setEditActivity(a); setModalOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(a)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${a.id}-detail`} className="bg-muted/10 border-b">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                            {/* Full activity detail */}
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Activity Details
                              </p>
                              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                {a.description && (
                                  <div className="col-span-2">
                                    <dt className="text-xs text-muted-foreground">Description</dt>
                                    <dd>{a.description}</dd>
                                  </div>
                                )}
                                {a.data_subjects && (
                                  <div>
                                    <dt className="text-xs text-muted-foreground">Data Subjects</dt>
                                    <dd>{a.data_subjects}</dd>
                                  </div>
                                )}
                                {a.personal_data_categories && (
                                  <div>
                                    <dt className="text-xs text-muted-foreground">Personal Data Categories</dt>
                                    <dd>{a.personal_data_categories}</dd>
                                  </div>
                                )}
                                {a.transfer_safeguards && (
                                  <div className="col-span-2">
                                    <dt className="text-xs text-muted-foreground">Transfer Safeguards</dt>
                                    <dd>{a.transfer_safeguards}</dd>
                                  </div>
                                )}
                                {(a.third_party_recipients_detail ?? []).length > 0 && (
                                  <div className="col-span-2">
                                    <dt className="text-xs text-muted-foreground mb-1">Third-Party Recipients</dt>
                                    <dd className="flex flex-wrap gap-1">
                                      {(a.third_party_recipients_detail ?? []).map(tp => (
                                        <span key={tp.id} className="rounded bg-muted px-1.5 py-0.5 text-xs">{tp.name}</span>
                                      ))}
                                    </dd>
                                  </div>
                                )}
                              </dl>
                            </div>

                            {/* Linked Data Flows — auto-populated via processing_activity FK */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Linked Data Flows
                              </p>
                              <LinkedDataFlows activityId={a.id} />
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {activities.length} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1}
              onClick={() => setParams(p => ({ ...p, page: (p.page ?? 1) - 1 }))}>Previous</Button>
            <span className="flex h-8 items-center px-3 text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
              onClick={() => setParams(p => ({ ...p, page: (p.page ?? 1) + 1 }))}>Next</Button>
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
