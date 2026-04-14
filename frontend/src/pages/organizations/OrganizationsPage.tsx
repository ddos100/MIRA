import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Building2, GitBranch, ChevronRight,
  FileText, AlertTriangle, Upload, CheckCircle, XCircle, Clock, TrendingUp, History,
} from "lucide-react";
import {
  useBusinessUnits, useCreateBusinessUnit, useUpdateBusinessUnit, useDeleteBusinessUnit,
  useBusinessProcesses, useCreateBusinessProcess, useUpdateBusinessProcess, useDeleteBusinessProcess,
  useScopes, useCreateScope, useUpdateScope, useDeleteScope, useScopeAction,
  useOrgIssues, useCreateOrgIssue, useUpdateOrgIssue, useDeleteOrgIssue,
  useRiskOpportunities, useCreateRiskOpportunity, useUpdateRiskOpportunity, useDeleteRiskOpportunity,
  type Scope, type OrganizationalIssue, type RiskOpportunity,
} from "@/api/organizations";
import { useUsers } from "@/api/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { BulkUploadSection } from "@/components/common/BulkUploadSection";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/utils/cn";

// ─── Local types ──────────────────────────────────────────────────────────────

interface BusinessUnit {
  id: string; name: string; description?: string; code?: string;
  parent?: string | null; parent_name?: string; organization_head_name?: string;
  is_active: boolean;
}
interface BusinessProcess {
  id: string; name: string; description?: string; business_unit: string;
  business_unit_name?: string; owner_name?: string; criticality: string; is_active: boolean;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const unitSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  code: z.string().optional(),
  parent: z.string().nullable().optional(),
  is_active: z.boolean(),
});
type UnitFormValues = z.infer<typeof unitSchema>;

const processSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  business_unit: z.string().min(1, "Required"),
  criticality: z.enum(["low", "medium", "high", "critical"]),
  is_active: z.boolean(),
});
type ProcessFormValues = z.infer<typeof processSchema>;

const scopeSchema = z.object({
  title: z.string().min(1, "Required"),
  content: z.string().optional(),
  version: z.string().min(1, "Required"),
  review_periodicity_days: z.coerce.number().min(1),
  effective_date: z.string().optional(),
  reviewer: z.string().nullable().optional(),
  approver: z.string().nullable().optional(),
});
type ScopeFormValues = z.infer<typeof scopeSchema>;

const riskOppSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  item_type: z.enum(["risk", "opportunity"]),
  linked_issue: z.string().nullable().optional(),
  likelihood: z.coerce.number().min(1).max(5),
  impact: z.coerce.number().min(1).max(5),
  treatment: z.enum(["accept", "mitigate", "transfer", "avoid", "exploit", "share", "enhance"]),
  treatment_plan: z.string().optional(),
  residual_level: z.enum(["low", "medium", "high", "critical", ""]),
  status: z.enum(["open", "in_treatment", "monitored", "closed"]),
  owner: z.string().nullable().optional(),
  due_date: z.string().optional(),
  review_notes: z.string().optional(),
});
type RiskOppFormValues = z.infer<typeof riskOppSchema>;

const issueSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  issue_type: z.enum(["internal", "external"]),
  category: z.enum(["risk", "opportunity", "constraint", "trend"]),
  impact_level: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "in_progress", "resolved", "accepted"]),
  due_date: z.string().optional(),
  resolution_notes: z.string().optional(),
});
type IssueFormValues = z.infer<typeof issueSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const critVariant: Record<string, string> = { low: "low", medium: "medium", high: "high", critical: "critical" };

function workflowBadge(state: Scope["workflow_state"]) {
  if (state === "approved") return <Badge variant="active">Approved</Badge>;
  if (state === "submitted") return <Badge variant="medium">Pending Approval</Badge>;
  if (state === "rejected") return <Badge variant="critical">Rejected</Badge>;
  return <Badge variant="inactive">Draft</Badge>;
}

// ─── Business Unit Modal ──────────────────────────────────────────────────────

function UnitFormModal({ open, onClose, editData, units }: { open: boolean; onClose: () => void; editData?: BusinessUnit; units: BusinessUnit[] }) {
  const createUnit = useCreateBusinessUnit();
  const updateUnit = useUpdateBusinessUnit(editData?.id ?? "");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: editData
      ? { name: editData.name, description: editData.description ?? "", code: editData.code ?? "", parent: editData.parent ?? null, is_active: editData.is_active }
      : { name: "", description: "", code: "", parent: null, is_active: true },
  });
  async function onSubmit(values: UnitFormValues) {
    const payload = { ...values, parent: values.parent || null };
    if (editData) await updateUnit.mutateAsync(payload); else await createUnit.mutateAsync(payload);
    reset(); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Business Unit" : "New Business Unit"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name *" error={errors.name?.message} {...register("name")} />
        <Input label="Code" placeholder="e.g. IT, HR" {...register("code")} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Parent Unit</label>
          <select {...register("parent")} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— No parent —</option>
            {units.filter(u => u.id !== editData?.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="unit-active" {...register("is_active")} />
          <label htmlFor="unit-active" className="text-sm">Active</label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{editData ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Business Process Modal ───────────────────────────────────────────────────

function ProcessFormModal({ open, onClose, editData, units }: { open: boolean; onClose: () => void; editData?: BusinessProcess; units: BusinessUnit[] }) {
  const createProcess = useCreateBusinessProcess();
  const updateProcess = useUpdateBusinessProcess(editData?.id ?? "");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: editData
      ? { name: editData.name, description: editData.description ?? "", business_unit: editData.business_unit, criticality: editData.criticality as ProcessFormValues["criticality"], is_active: editData.is_active }
      : { name: "", description: "", business_unit: "", criticality: "medium", is_active: true },
  });
  async function onSubmit(values: ProcessFormValues) {
    if (editData) await updateProcess.mutateAsync(values); else await createProcess.mutateAsync(values);
    reset(); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Process" : "New Process"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name *" error={errors.name?.message} {...register("name")} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <div>
          <label className="text-sm font-medium block mb-1">Business Unit *</label>
          <select {...register("business_unit")} className={cn("w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring", errors.business_unit && "border-destructive")}>
            <option value="">Select...</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <Select label="Criticality" options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }]} {...register("criticality")} />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="proc-active" {...register("is_active")} />
          <label htmlFor="proc-active" className="text-sm">Active</label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{editData ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Scope Form Modal ─────────────────────────────────────────────────────────

const PERIODICITY_OPTIONS = [
  { value: "30", label: "Monthly (30 days)" },
  { value: "60", label: "Bi-Monthly (60 days)" },
  { value: "90", label: "Quarterly (90 days)" },
  { value: "180", label: "Semi-Annual (180 days)" },
  { value: "365", label: "Annual (365 days)" },
  { value: "730", label: "Bi-Annual (730 days)" },
];

function ScopeFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: Scope }) {
  const createScope = useCreateScope();
  const updateScope = useUpdateScope(editData?.id ?? "");
  const { data: usersData } = useUsers({ page_size: 200 });
  const users = usersData?.results ?? usersData ?? [];
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ScopeFormValues>({
    resolver: zodResolver(scopeSchema),
    defaultValues: editData
      ? { title: editData.title, content: editData.content, version: editData.version, review_periodicity_days: editData.review_periodicity_days, effective_date: editData.effective_date ?? "", reviewer: editData.reviewer ?? "", approver: editData.approver ?? "" }
      : { title: "ISMS Scope", content: "", version: "1.0", review_periodicity_days: 365, effective_date: "", reviewer: null, approver: null },
  });
  async function onSubmit(values: ScopeFormValues) {
    const payload = { ...values, effective_date: values.effective_date || null, reviewer: values.reviewer || null, approver: values.approver || null };
    if (editData) await updateScope.mutateAsync(payload); else await createScope.mutateAsync(payload);
    reset(); onClose();
  }
  const selectCls = "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Scope Document" : "New Scope Document"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Title *" error={errors.title?.message} {...register("title")} />
          <Input label="Version *" placeholder="e.g. 1.0" error={errors.version?.message} {...register("version")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Review Periodicity *</label>
            <select {...register("review_periodicity_days")} className={selectCls}>
              {PERIODICITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Input label="Effective Date" type="date" {...register("effective_date")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Maker (Reviewer)</label>
            <select {...register("reviewer")} className={selectCls}>
              <option value="">— Select Maker —</option>
              {users.map((u: { id: string; first_name?: string; last_name?: string; email: string }) => (
                <option key={u.id} value={u.id}>{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Person who prepares & submits the scope</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Checker (Approver)</label>
            <select {...register("approver")} className={selectCls}>
              <option value="">— Select Checker —</option>
              {users.map((u: { id: string; first_name?: string; last_name?: string; email: string }) => (
                <option key={u.id} value={u.id}>{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Person who approves or rejects the scope</p>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Scope Content (Markdown)</label>
          <textarea {...register("content")} rows={10} className={`${selectCls} font-mono`} placeholder="Describe the scope of the ISMS..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{editData ? "Save Changes" : "Create Scope"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Scope Tab ────────────────────────────────────────────────────────────────

function ScopeTab() {
  const { data: scopes = [], isLoading } = useScopes();
  const deleteScope = useDeleteScope();
  const [modalOpen, setModalOpen] = useState(false);
  const [editScope, setEditScope] = useState<Scope | undefined>();
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function ActionButtons({ scope }: { scope: Scope }) {
    const submit = useScopeAction(scope.id, "submit");
    const approve = useScopeAction(scope.id, "approve");
    const reject = useScopeAction(scope.id, "reject");
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {(scope.workflow_state === "draft" || scope.workflow_state === "rejected") && (
          <Button size="sm" variant="outline" isLoading={submit.isPending} onClick={() => submit.mutate({})}>
            <Clock className="h-3.5 w-3.5" /> Submit for Approval
          </Button>
        )}
        {scope.workflow_state === "submitted" && (
          <>
            <Button size="sm" isLoading={approve.isPending} onClick={() => approve.mutate({})}>
              <CheckCircle className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejectModal({ id: scope.id })}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
          </>
        )}
      </div>
    );
  }

  const RejectDialog = ({ id }: { id: string }) => {
    const reject = useScopeAction(id, "reject");
    return (
      <Modal open onClose={() => setRejectModal(null)} title="Reject Scope" size="sm">
        <div className="space-y-4">
          <Textarea label="Rejection Reason" rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="destructive" isLoading={reject.isPending} onClick={() => reject.mutate({ reason: rejectReason }, { onSuccess: () => { setRejectModal(null); setRejectReason(""); } })}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditScope(undefined); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> New Scope Version
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : scopes.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No scope documents yet. Create one to define your ISMS scope.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scopes.map(scope => (
            <div key={scope.id} className="border rounded-lg bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{scope.title}</h3>
                    <span className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5">v{scope.version}</span>
                    {workflowBadge(scope.workflow_state)}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground mt-2">
                    {scope.effective_date && <span>Effective: {scope.effective_date}</span>}
                    {scope.next_review_date && <span className="font-medium text-foreground">Next Review: {scope.next_review_date}</span>}
                    <span>Periodicity: {scope.review_periodicity_display}</span>
                    {scope.reviewer_name && <span>Maker: {scope.reviewer_name}</span>}
                    {scope.approver_name && <span>Checker: {scope.approver_name}</span>}
                    {scope.approved_at && <span>Last Approved: {new Date(scope.approved_at).toLocaleDateString()}</span>}
                  </div>
                  {scope.rejection_reason && (
                    <p className="text-xs text-destructive mt-2">Rejection reason: {scope.rejection_reason}</p>
                  )}
                  {scope.content && (
                    <pre className="mt-3 text-xs text-muted-foreground bg-muted/30 rounded p-3 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
                      {scope.content}
                    </pre>
                  )}
                  <ActionButtons scope={scope} />
                  {scope.approval_history && scope.approval_history.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-1 select-none hover:text-foreground">
                        <History className="h-3 w-3" /> Approval History ({scope.approval_history.length})
                      </summary>
                      <div className="mt-2 border rounded overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/40 border-b">
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Version</th>
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Approved By</th>
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Approved At</th>
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Next Review</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scope.approval_history.map(h => (
                              <tr key={h.id} className="border-b last:border-0">
                                <td className="px-3 py-1.5">v{h.version}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{h.approved_by_name || "—"}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{new Date(h.approved_at).toLocaleDateString()}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{h.next_review_date ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditScope(scope); setModalOpen(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (confirm("Delete scope?")) deleteScope.mutate(scope.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScopeFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditScope(undefined); }} editData={editScope} />
      {rejectModal && <RejectDialog id={rejectModal.id} />}
    </div>
  );
}

// ─── Risk / Opportunity Form Modal ───────────────────────────────────────────

function RiskOppFormModal({ open, onClose, editData, issues }: { open: boolean; onClose: () => void; editData?: RiskOpportunity; issues: OrganizationalIssue[] }) {
  const createRisk = useCreateRiskOpportunity();
  const updateRisk = useUpdateRiskOpportunity(editData?.id ?? "");
  const { data: usersData } = useUsers({ page_size: 200 });
  const users = usersData?.results ?? usersData ?? [];
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<RiskOppFormValues>({
    resolver: zodResolver(riskOppSchema),
    defaultValues: editData
      ? { title: editData.title, description: editData.description, item_type: editData.item_type, linked_issue: editData.linked_issue ?? "", likelihood: editData.likelihood, impact: editData.impact, treatment: editData.treatment, treatment_plan: editData.treatment_plan, residual_level: (editData.residual_level as RiskOppFormValues["residual_level"]) || "", status: editData.status as RiskOppFormValues["status"], owner: editData.owner ?? "", due_date: editData.due_date ?? "", review_notes: editData.review_notes }
      : { title: "", description: "", item_type: "risk", linked_issue: null, likelihood: 3, impact: 3, treatment: "mitigate", treatment_plan: "", residual_level: "", status: "open", owner: null, due_date: "", review_notes: "" },
  });
  const itemType = watch("item_type");
  const likelihood = watch("likelihood");
  const impact = watch("impact");
  const riskScore = Number(likelihood) * Number(impact);

  async function onSubmit(values: RiskOppFormValues) {
    const payload = {
      ...values,
      linked_issue: values.linked_issue || null,
      owner: values.owner || null,
      due_date: values.due_date || null,
      residual_level: values.residual_level || "",
      likelihood: Number(values.likelihood) as 1 | 2 | 3 | 4 | 5,
      impact: Number(values.impact) as 1 | 2 | 3 | 4 | 5,
    };
    if (editData) await updateRisk.mutateAsync(payload as Partial<RiskOpportunity>); else await createRisk.mutateAsync(payload as Partial<RiskOpportunity>);
    reset(); onClose();
  }
  const selectCls = "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  const treatmentOptions = itemType === "opportunity"
    ? [{ value: "exploit", label: "Exploit" }, { value: "share", label: "Share" }, { value: "enhance", label: "Enhance" }, { value: "accept", label: "Accept" }]
    : [{ value: "mitigate", label: "Mitigate" }, { value: "transfer", label: "Transfer" }, { value: "avoid", label: "Avoid" }, { value: "accept", label: "Accept" }];

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Risk / Opportunity" : "Add Risk / Opportunity"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Type *</label>
            <select {...register("item_type")} className={selectCls}>
              <option value="risk">Risk</option>
              <option value="opportunity">Opportunity</option>
            </select>
          </div>
          <Input label="Title *" error={errors.title?.message} {...register("title")} />
        </div>
        <Textarea label="Description" rows={2} {...register("description")} />
        <div>
          <label className="text-sm font-medium block mb-1">Linked Issue (§4.1/§4.2)</label>
          <select {...register("linked_issue")} className={selectCls}>
            <option value="">— None —</option>
            {issues.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Likelihood (1–5) *</label>
            <select {...register("likelihood")} className={selectCls}>
              <option value="1">1 – Rare</option>
              <option value="2">2 – Unlikely</option>
              <option value="3">3 – Possible</option>
              <option value="4">4 – Likely</option>
              <option value="5">5 – Almost Certain</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Impact (1–5) *</label>
            <select {...register("impact")} className={selectCls}>
              <option value="1">1 – Negligible</option>
              <option value="2">2 – Minor</option>
              <option value="3">3 – Moderate</option>
              <option value="4">4 – Major</option>
              <option value="5">5 – Catastrophic</option>
            </select>
          </div>
          <div className="flex flex-col justify-end pb-0.5">
            <label className="text-sm font-medium block mb-1">Risk Score</label>
            <div className={cn("border rounded-md px-3 py-2 text-sm font-bold text-center",
              riskScore <= 4 ? "bg-green-50 text-green-700 border-green-200" :
              riskScore <= 9 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
              riskScore <= 16 ? "bg-orange-50 text-orange-700 border-orange-200" :
              "bg-red-50 text-red-700 border-red-200")}>
              {riskScore} / 25
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Treatment *</label>
            <select {...register("treatment")} className={selectCls}>
              {treatmentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Residual Level</label>
            <select {...register("residual_level")} className={selectCls}>
              <option value="">— Not set —</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <Textarea label="Treatment Plan" rows={2} {...register("treatment_plan")} />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Status *</label>
            <select {...register("status")} className={selectCls}>
              <option value="open">Open</option>
              <option value="in_treatment">In Treatment</option>
              <option value="monitored">Monitored</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Owner</label>
            <select {...register("owner")} className={selectCls}>
              <option value="">— None —</option>
              {users.map((u: { id: string; first_name?: string; last_name?: string; email: string }) => (
                <option key={u.id} value={u.id}>{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email}</option>
              ))}
            </select>
          </div>
          <Input label="Due Date" type="date" {...register("due_date")} />
        </div>
        <Textarea label="Review Notes" rows={2} {...register("review_notes")} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{editData ? "Save" : "Add"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Risks & Opportunities Tab ────────────────────────────────────────────────

function RisksTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<"" | "risk" | "opportunity">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RiskOpportunity | undefined>();
  const [showUpload, setShowUpload] = useState(false);

  const params: Record<string, unknown> = {};
  if (typeFilter) params.item_type = typeFilter;
  if (statusFilter) params.status = statusFilter;

  const { data: items = [], isLoading } = useRiskOpportunities(params);
  const { data: issues = [] } = useOrgIssues();
  const deleteItem = useDeleteRiskOpportunity();

  const scoreBg = (score: number) =>
    score <= 4 ? "bg-green-100 text-green-800" :
    score <= 9 ? "bg-yellow-100 text-yellow-800" :
    score <= 16 ? "bg-orange-100 text-orange-800" :
    "bg-red-100 text-red-800";

  const statusVariant: Record<string, string> = { open: "inactive", in_treatment: "medium", monitored: "low", closed: "active" };
  const residualVariant: Record<string, string> = { low: "low", medium: "medium", high: "high", critical: "critical" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as "" | "risk" | "opportunity")}
            className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">All Types</option>
            <option value="risk">Risk</option>
            <option value="opportunity">Opportunity</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_treatment">In Treatment</option>
            <option value="monitored">Monitored</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUpload(v => !v)}>
            <Upload className="h-4 w-4" /> {showUpload ? "Hide Upload" : "Bulk Upload"}
          </Button>
          <Button onClick={() => { setEditItem(undefined); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Risk / Opportunity
          </Button>
        </div>
      </div>

      {showUpload && (
        <BulkUploadSection
          endpoint="/organizations/risk-opportunities/import-csv/"
          entityName="Risks & Opportunities"
          columns={[
            { name: "title", description: "Title", required: "Yes" },
            { name: "item_type", description: "risk or opportunity", required: "No" },
            { name: "likelihood", description: "1–5 integer", required: "No" },
            { name: "impact", description: "1–5 integer", required: "No" },
            { name: "treatment", description: "accept, mitigate, transfer, avoid, exploit, share, enhance", required: "No" },
            { name: "treatment_plan", description: "Actions to address this item", required: "No" },
            { name: "residual_level", description: "low, medium, high, critical", required: "No" },
            { name: "status", description: "open, in_treatment, monitored, closed", required: "No" },
            { name: "due_date", description: "YYYY-MM-DD format", required: "No" },
          ]}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["risk-opportunities"] })}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No risks or opportunities yet. Add items aligned to ISO 27001:2022 §6.1.</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Treatment</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Residual</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.title}</div>
                    {item.linked_issue_title && <div className="text-xs text-muted-foreground">Source: {item.linked_issue_title}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.item_type === "opportunity" ? "active" : "medium"}>
                      {item.item_type_display}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-bold", scoreBg(item.risk_score))}>
                      {item.risk_score}
                    </span>
                    <div className="text-xs text-muted-foreground">{item.likelihood_display?.split("–")[0]?.trim()} × {item.impact_display?.split("–")[0]?.trim()}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.treatment_display}</td>
                  <td className="px-4 py-3">
                    {item.residual_level ? <Badge variant={residualVariant[item.residual_level] ?? "default"}>{item.residual_level_display}</Badge> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[item.status] ?? "default"}>{item.status_display}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.owner_name || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditItem(item); setModalOpen(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm("Delete this item?")) deleteItem.mutate(item.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RiskOppFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(undefined); }} editData={editItem} issues={issues} />
    </div>
  );
}

// ─── Issue Form Modal ─────────────────────────────────────────────────────────

function IssueFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: OrganizationalIssue }) {
  const createIssue = useCreateOrgIssue();
  const updateIssue = useUpdateOrgIssue(editData?.id ?? "");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: editData
      ? { title: editData.title, description: editData.description, issue_type: editData.issue_type, category: editData.category, impact_level: editData.impact_level, status: editData.status, due_date: editData.due_date ?? "", resolution_notes: editData.resolution_notes }
      : { title: "", description: "", issue_type: "internal", category: "risk", impact_level: "medium", status: "open", due_date: "", resolution_notes: "" },
  });
  async function onSubmit(values: IssueFormValues) {
    const payload = { ...values, due_date: values.due_date || null };
    if (editData) await updateIssue.mutateAsync(payload); else await createIssue.mutateAsync(payload);
    reset(); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Issue" : "New Issue"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" error={errors.title?.message} {...register("title")} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Type" options={[{ value: "internal", label: "Internal" }, { value: "external", label: "External" }]} {...register("issue_type")} />
          <Select label="Category" options={[{ value: "risk", label: "Risk" }, { value: "opportunity", label: "Opportunity" }, { value: "constraint", label: "Constraint" }, { value: "trend", label: "Trend" }]} {...register("category")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Impact Level" options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }]} {...register("impact_level")} />
          <Select label="Status" options={[{ value: "open", label: "Open" }, { value: "in_progress", label: "In Progress" }, { value: "resolved", label: "Resolved" }, { value: "accepted", label: "Accepted" }]} {...register("status")} />
        </div>
        <Textarea label="Description" rows={3} {...register("description")} />
        <Input label="Due Date" type="date" {...register("due_date")} />
        <Textarea label="Resolution Notes" rows={3} {...register("resolution_notes")} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{editData ? "Save" : "Create Issue"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Issues Tab ───────────────────────────────────────────────────────────────

function IssuesTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<"" | "internal" | "external">("");
  const [catFilter, setCatFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editIssue, setEditIssue] = useState<OrganizationalIssue | undefined>();
  const [showUpload, setShowUpload] = useState(false);

  const params: Record<string, unknown> = {};
  if (typeFilter) params.issue_type = typeFilter;
  if (catFilter) params.category = catFilter;

  const { data: issues = [], isLoading } = useOrgIssues(params);
  const deleteIssue = useDeleteOrgIssue();

  const impactVariant: Record<string, string> = { low: "low", medium: "medium", high: "high", critical: "critical" };
  const statusVariant: Record<string, string> = { open: "inactive", in_progress: "medium", resolved: "active", accepted: "low" };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as "" | "internal" | "external")}
            className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">All Types</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">All Categories</option>
            <option value="risk">Risk</option>
            <option value="opportunity">Opportunity</option>
            <option value="constraint">Constraint</option>
            <option value="trend">Trend</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUpload(v => !v)}>
            <Upload className="h-4 w-4" /> {showUpload ? "Hide Upload" : "Bulk Upload"}
          </Button>
          <Button onClick={() => { setEditIssue(undefined); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Issue
          </Button>
        </div>
      </div>

      {showUpload && (
        <BulkUploadSection
          endpoint="/organizations/issues/import-csv/"
          entityName="Issues"
          columns={[
            { name: "title", description: "Issue title", required: "Yes" },
            { name: "description", description: "Detailed description", required: "No" },
            { name: "issue_type", description: "internal or external", required: "No" },
            { name: "category", description: "risk, opportunity, constraint, trend", required: "No" },
            { name: "impact_level", description: "low, medium, high, critical", required: "No" },
            { name: "status", description: "open, in_progress, resolved, accepted", required: "No" },
            { name: "due_date", description: "YYYY-MM-DD format", required: "No" },
            { name: "resolution_notes", description: "Notes on resolution", required: "No" },
          ]}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["org-issues"] })}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : issues.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No issues found. Add internal/external issues aligned to ISO 27001 §4.1/4.2.</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Impact</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map(issue => (
                <tr key={issue.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{issue.title}</div>
                    {issue.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{issue.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={issue.issue_type === "external" ? "medium" : "inactive"}>
                      {issue.issue_type_display}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{issue.category_display}</td>
                  <td className="px-4 py-3">
                    <Badge variant={impactVariant[issue.impact_level] ?? "default"}>
                      {issue.impact_level_display}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[issue.status] ?? "default"}>
                      {issue.status_display}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{issue.due_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditIssue(issue); setModalOpen(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Delete issue?")) deleteIssue.mutate(issue.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <IssueFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditIssue(undefined); }} editData={editIssue} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "units" | "processes" | "scope" | "issues" | "risks";

export default function OrganizationsPage() {
  const [tab, setTab] = useState<Tab>("units");
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<BusinessUnit | undefined>();
  const [editProcess, setEditProcess] = useState<BusinessProcess | undefined>();
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [critFilter, setCritFilter] = useState("");

  const { data: unitsData, isLoading: unitsLoading } = useBusinessUnits({ page_size: 200 });
  const { data: processesData, isLoading: processesLoading } = useBusinessProcesses(
    critFilter ? { criticality: critFilter, page_size: 200 } : { page_size: 200 }
  );
  const units: BusinessUnit[] = unitsData?.results ?? unitsData ?? [];
  const processes: BusinessProcess[] = processesData?.results ?? processesData ?? [];
  const deleteUnit = useDeleteBusinessUnit();
  const deleteProcess = useDeleteBusinessProcess();

  const tabs = [
    { id: "units" as Tab, label: "Business Units", icon: Building2, count: units.length },
    { id: "processes" as Tab, label: "Business Processes", icon: GitBranch, count: processes.length },
    { id: "scope" as Tab, label: "Scope", icon: FileText, count: null },
    { id: "issues" as Tab, label: "Issues", icon: AlertTriangle, count: null },
    { id: "risks" as Tab, label: "Risks & Opportunities", icon: TrendingUp, count: null },
  ];

  const headerActions = tab === "units"
    ? <Button onClick={() => { setEditUnit(undefined); setUnitModalOpen(true); }}><Plus className="h-4 w-4" /> New Business Unit</Button>
    : tab === "processes"
    ? <Button onClick={() => { setEditProcess(undefined); setProcessModalOpen(true); }}><Plus className="h-4 w-4" /> New Business Process</Button>
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Manage business structure, ISMS scope, and organizational issues." actions={headerActions} />

      {/* Tabs */}
      <div className="flex border-b flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count !== null && <span className="ml-1 text-xs bg-muted rounded-full px-1.5">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Business Units ── */}
      {tab === "units" && (
        <div className="space-y-2">
          {unitsLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
          ) : units.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No business units yet.</p>
            </div>
          ) : units.map(unit => {
            const unitProcesses = processes.filter(p => p.business_unit === unit.id);
            const isExpanded = expandedUnit === unit.id;
            return (
              <div key={unit.id} className="border rounded-lg bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setExpandedUnit(isExpanded ? null : unit.id)} className="flex items-center gap-2 flex-1 text-left">
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-90")} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{unit.name}</span>
                        {unit.code && <span className="text-xs bg-muted rounded px-1.5 py-0.5">{unit.code}</span>}
                        {!unit.is_active && <Badge variant="inactive">Inactive</Badge>}
                      </div>
                      {unit.parent_name && <p className="text-xs text-muted-foreground">Parent: {unit.parent_name}</p>}
                    </div>
                  </button>
                  <span className="text-xs text-muted-foreground">{unitProcesses.length} process{unitProcesses.length !== 1 ? "es" : ""}</span>
                  {unit.organization_head_name && <span className="text-sm text-muted-foreground hidden md:block">Head: {unit.organization_head_name}</span>}
                  <div className="flex gap-1">
                    <button onClick={() => { setEditUnit(unit); setUnitModalOpen(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm("Delete unit?")) deleteUnit.mutate(unit.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-muted/20">
                    {unit.description && <p className="text-sm text-muted-foreground mb-3">{unit.description}</p>}
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Processes ({unitProcesses.length})</h4>
                    {unitProcesses.length === 0 ? <p className="text-sm text-muted-foreground">No processes.</p> : (
                      <div className="space-y-1">
                        {unitProcesses.map(p => (
                          <div key={p.id} className="flex items-center gap-2 text-sm">
                            <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{p.name}</span>
                            <Badge variant={critVariant[p.criticality] ?? "default"}>{p.criticality}</Badge>
                            {!p.is_active && <Badge variant="inactive">Inactive</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Business Processes ── */}
      {tab === "processes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select value={critFilter} onChange={e => setCritFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All Criticalities</option>
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          {processesLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
          ) : processes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No business processes found.</p>
            </div>
          ) : (
            <div className="border rounded-lg bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Process</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Business Unit</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Criticality</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.business_unit_name ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant={critVariant[p.criticality] ?? "default"}>{p.criticality}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{p.owner_name ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant={p.is_active ? "active" : "inactive"}>{p.is_active ? "Active" : "Inactive"}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setEditProcess(p); setProcessModalOpen(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { if (confirm("Delete process?")) deleteProcess.mutate(p.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Scope Tab ── */}
      {tab === "scope" && <ScopeTab />}

      {/* ── Issues Tab ── */}
      {tab === "issues" && <IssuesTab />}

      {/* ── Risks & Opportunities Tab ── */}
      {tab === "risks" && <RisksTab />}

      <UnitFormModal open={unitModalOpen} onClose={() => { setUnitModalOpen(false); setEditUnit(undefined); }} editData={editUnit} units={units} />
      <ProcessFormModal open={processModalOpen} onClose={() => { setProcessModalOpen(false); setEditProcess(undefined); }} editData={editProcess} units={units} />
    </div>
  );
}
