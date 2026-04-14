import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, AlertCircle,
  Clock, MinusCircle, ShieldAlert, ExternalLink, ChevronDown, ChevronRight,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useDataFlow,
  useDataFlowLifecycleStages,
  useCreateLifecycleStage,
  useUpdateLifecycleStage,
  useDeleteLifecycleStage,
  useUpdateLifecycleRequirement,
  type DataLifecycleStage,
  type DataLifecycleRequirement,
  type ComplianceRating,
} from "@/api/assets";
import { useProcessingActivities } from "@/api/privacy";
import { useUsers } from "@/api/auth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIFECYCLE_STAGES = [
  { value: "collection", label: "Collection" },
  { value: "processing", label: "Processing" },
  { value: "storage",    label: "Storage" },
  { value: "sharing",    label: "Sharing" },
  { value: "archival",   label: "Archival" },
  { value: "deletion",   label: "Deletion" },
];

const GDPR_LEGAL_BASIS = [
  "", "Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))",
  "Legal Obligation (Art. 6(1)(c))", "Vital Interests (Art. 6(1)(d))",
  "Public Task (Art. 6(1)(e))", "Legitimate Interests (Art. 6(1)(f))",
];

const DPDPA_LEGAL_BASIS = [
  "", "Consent (S.6)", "Legitimate Use – Voluntary (S.7(a))",
  "Legitimate Use – State Function (S.7(b))", "Legitimate Use – Legal Obligation (S.7(c))",
  "Legitimate Use – Medical/Emergency (S.7(d))", "Legitimate Use – Employment (S.7(e))",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ratingIcon(r: ComplianceRating) {
  if (r === "met")     return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (r === "partial") return <MinusCircle  className="h-4 w-4 text-yellow-500" />;
  if (r === "not_met") return <AlertCircle  className="h-4 w-4 text-red-600" />;
  if (r === "na")      return <MinusCircle  className="h-4 w-4 text-muted-foreground" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function ratingBadge(r: ComplianceRating) {
  const cls = {
    met:     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    not_met: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    na:      "bg-muted text-muted-foreground",
    pending: "bg-muted text-muted-foreground",
  }[r] ?? "bg-muted text-muted-foreground";
  const label = { met: "Met", partial: "Partial", not_met: "Not Met", na: "N/A", pending: "Pending" }[r] ?? r;
  return <span className={cn("inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium", cls)}>{ratingIcon(r)}{label}</span>;
}

function complianceColor(status: ComplianceRating) {
  return {
    met:     "border-green-300 bg-green-50 dark:bg-green-900/10",
    partial: "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10",
    not_met: "border-red-300 bg-red-50 dark:bg-red-900/10",
    na:      "border-muted",
    pending: "border-muted",
  }[status] ?? "border-muted";
}

// ─── Stage Form Modal ─────────────────────────────────────────────────────────

const stageSchema = z.object({
  stage: z.enum(["collection","processing","storage","sharing","archival","deletion"]),
  processing_activity: z.string().optional(),
  purpose: z.string().optional(),
  legal_basis_gdpr: z.string().optional(),
  legal_basis_dpdpa: z.string().optional(),
  data_subject_categories: z.string().optional(),
  personal_data_categories: z.string().optional(),
  special_category_data: z.boolean(),
  retention_period_days: z.coerce.number().nullable().optional(),
  retention_justification: z.string().optional(),
  security_measures: z.string().optional(),
  third_party_name: z.string().optional(),
  third_party_agreement: z.boolean(),
  transfer_safeguards: z.string().optional(),
  is_cross_border: z.boolean(),
  deletion_method: z.string().optional(),
  notes: z.string().optional(),
  compliance_notes: z.string().optional(),
  owner: z.string().optional(),
});
type StageForm = z.infer<typeof stageSchema>;

function StageFormModal({
  open, onClose, flowId, editData, usedStages,
}: {
  open: boolean; onClose: () => void; flowId: string;
  editData?: DataLifecycleStage; usedStages: string[];
}) {
  const create = useCreateLifecycleStage();
  const update = useUpdateLifecycleStage(editData?.id ?? "");
  const { data: paData } = useProcessingActivities({ page_size: 200 });
  const { data: usersData } = useUsers({ page_size: 200 });
  const activities = paData?.results ?? [];
  const users = usersData?.results ?? [];

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<StageForm>({
    resolver: zodResolver(stageSchema),
    defaultValues: editData ? {
      stage: editData.stage as StageForm["stage"],
      processing_activity: editData.processing_activity ?? "",
      purpose: editData.purpose,
      legal_basis_gdpr: editData.legal_basis_gdpr,
      legal_basis_dpdpa: editData.legal_basis_dpdpa,
      data_subject_categories: editData.data_subject_categories,
      personal_data_categories: editData.personal_data_categories,
      special_category_data: editData.special_category_data,
      retention_period_days: editData.retention_period_days,
      retention_justification: editData.retention_justification,
      security_measures: editData.security_measures,
      third_party_name: editData.third_party_name,
      third_party_agreement: editData.third_party_agreement,
      transfer_safeguards: editData.transfer_safeguards,
      is_cross_border: editData.is_cross_border,
      deletion_method: editData.deletion_method,
      notes: editData.notes,
      compliance_notes: editData.compliance_notes,
      owner: editData.owner ?? "",
    } : {
      stage: "collection", processing_activity: "", purpose: "",
      legal_basis_gdpr: "", legal_basis_dpdpa: "", data_subject_categories: "",
      personal_data_categories: "", special_category_data: false,
      retention_period_days: null, retention_justification: "", security_measures: "",
      third_party_name: "", third_party_agreement: false, transfer_safeguards: "",
      is_cross_border: false, deletion_method: "", notes: "", compliance_notes: "", owner: "",
    },
  });

  async function onSubmit(values: StageForm) {
    const payload = {
      ...values,
      data_flow: flowId,
      processing_activity: values.processing_activity || null,
      owner: values.owner || null,
      retention_period_days: values.retention_period_days || null,
    };
    if (editData) await update.mutateAsync(payload as Partial<DataLifecycleStage>);
    else await create.mutateAsync(payload as Partial<DataLifecycleStage>);
    reset(); onClose();
  }

  const availableStages = LIFECYCLE_STAGES.filter(s => editData?.stage === s.value || !usedStages.includes(s.value));
  const sel = "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Lifecycle Stage" : "Add Lifecycle Stage"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Stage *</label>
            <select {...register("stage")} disabled={!!editData} className={sel}>
              {availableStages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">RoPA Processing Activity</label>
            <select {...register("processing_activity")} className={sel}>
              <option value="">— None —</option>
              {activities.map((a: { id: string; name: string }) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <Textarea label="Purpose" rows={2} {...register("purpose")} placeholder="What is the data used for at this stage?" />

        <fieldset className="border rounded-lg p-4 space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Legal Basis</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">GDPR (Art. 6)</label>
              <select {...register("legal_basis_gdpr")} className={sel}>
                {GDPR_LEGAL_BASIS.map(b => <option key={b} value={b}>{b || "— Not specified —"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">DPDPA (S.6/S.7)</label>
              <select {...register("legal_basis_dpdpa")} className={sel}>
                {DPDPA_LEGAL_BASIS.map(b => <option key={b} value={b}>{b || "— Not specified —"}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <Textarea label="Data Subject Categories" rows={2} {...register("data_subject_categories")} placeholder="e.g. Customers, Employees" />
          <Textarea label="Personal Data Categories" rows={2} {...register("personal_data_categories")} placeholder="e.g. Name, Email, ID" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Retention (days)</label>
            <input type="number" {...register("retention_period_days")} min={0} className={sel} />
          </div>
          <Textarea label="Retention Justification" rows={2} {...register("retention_justification")} />
          <Textarea label="Security Measures" rows={2} {...register("security_measures")} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Third Party / Recipient" {...register("third_party_name")} />
          <Textarea label="Transfer Safeguards" rows={2} {...register("transfer_safeguards")} />
          <Textarea label="Deletion / Disposal Method" rows={2} {...register("deletion_method")} />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("special_category_data")} className="rounded" />
            Special Category Data (Art. 9 / DPDPA S.9)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("is_cross_border")} className="rounded" />
            Cross-Border Transfer
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("third_party_agreement")} className="rounded" />
            Third-Party Agreement in Place
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Stage Owner</label>
            <select {...register("owner")} className={sel}>
              <option value="">— None —</option>
              {users.map((u: { id: string; first_name?: string; last_name?: string; email: string }) => (
                <option key={u.id} value={u.id}>
                  {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
                </option>
              ))}
            </select>
          </div>
          <Textarea label="Stage Notes" rows={2} {...register("notes")} />
        </div>
        <Textarea label="Compliance Notes" rows={2} {...register("compliance_notes")} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{editData ? "Save Stage" : "Add Stage"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Compliance Requirement Row ───────────────────────────────────────────────

function RequirementRow({ req }: { req: DataLifecycleRequirement }) {
  const update = useUpdateLifecycleRequirement(req.id);
  const [notes, setNotes] = useState(req.notes);
  const [editingNotes, setEditingNotes] = useState(false);

  function setRating(rating: ComplianceRating) {
    update.mutate({ rating, notes });
  }

  function saveNotes() {
    update.mutate({ rating: req.rating, notes });
    setEditingNotes(false);
  }

  const RATINGS: { value: ComplianceRating; label: string }[] = [
    { value: "met",     label: "Met" },
    { value: "partial", label: "Partial" },
    { value: "not_met", label: "Not Met" },
    { value: "na",      label: "N/A" },
  ];

  return (
    <div className={cn("rounded-lg border p-3 transition-colors", req.rating === "not_met" ? "border-red-200 bg-red-50/50 dark:bg-red-900/10" : "")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold",
              req.framework === "gdpr" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800")}>
              {req.framework.toUpperCase()}
            </span>
            <span className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">{req.article_reference}</span>
            <span className="text-sm font-medium">{req.requirement_label}</span>
            {req.privacy_risk && (
              <Link to={`/risks`} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                <ShieldAlert className="h-3 w-3" /> Privacy Risk
              </Link>
            )}
          </div>
          {editingNotes ? (
            <div className="mt-2 flex gap-2">
              <input value={notes} onChange={e => setNotes(e.target.value)}
                className="flex-1 h-8 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Add notes…" />
              <Button size="sm" onClick={saveNotes} isLoading={update.isPending}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setEditingNotes(true)}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Pencil className="h-3 w-3" />
              {notes || "Add notes…"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {RATINGS.map(r => (
            <button key={r.value} onClick={() => setRating(r.value)}
              disabled={update.isPending}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors border",
                req.rating === r.value
                  ? r.value === "met"     ? "bg-green-600 text-white border-green-600"
                  : r.value === "partial" ? "bg-yellow-500 text-white border-yellow-500"
                  : r.value === "not_met" ? "bg-red-600 text-white border-red-600"
                  : "bg-muted text-muted-foreground border-muted"
                  : "bg-background text-muted-foreground border-input hover:bg-muted"
              )}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stage Card ───────────────────────────────────────────────────────────────

function StageCard({
  stage, flowId, usedStages, onEdit, onDelete,
}: {
  stage: DataLifecycleStage; flowId: string; usedStages: string[];
  onEdit: (s: DataLifecycleStage) => void; onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const gdprReqs  = stage.requirements.filter(r => r.framework === "gdpr");
  const dpdpaReqs = stage.requirements.filter(r => r.framework === "dpdpa");
  const notMetCount = stage.requirements.filter(r => r.rating === "not_met").length;
  const metCount    = stage.requirements.filter(r => r.rating === "met").length;

  return (
    <div className={cn("rounded-lg border-2 bg-card", complianceColor(stage.compliance_status))}>
      {/* Stage header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setExpanded(v => !v)}>
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <h3 className="font-semibold">{stage.stage_display}</h3>
          {ratingBadge(stage.compliance_status)}
          <span className="text-xs text-muted-foreground ml-1">
            {metCount}/{stage.requirements.length} met
            {notMetCount > 0 && <span className="text-red-600"> · {notMetCount} not met</span>}
          </span>
          {stage.processing_activity_name && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              RoPA: {stage.processing_activity_name}
            </span>
          )}
        </button>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(stage)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(stage.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Stage detail fields */}
          {(stage.purpose || stage.legal_basis_gdpr || stage.legal_basis_dpdpa) && (
            <div className="grid grid-cols-3 gap-4 text-xs">
              {stage.purpose && <div><span className="text-muted-foreground">Purpose: </span>{stage.purpose}</div>}
              {stage.legal_basis_gdpr && <div><span className="text-muted-foreground">GDPR basis: </span>{stage.legal_basis_gdpr}</div>}
              {stage.legal_basis_dpdpa && <div><span className="text-muted-foreground">DPDPA basis: </span>{stage.legal_basis_dpdpa}</div>}
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {stage.retention_period_days != null && <span>Retention: {stage.retention_period_days}d</span>}
            {stage.is_cross_border && <Badge variant="high">Cross-Border</Badge>}
            {stage.special_category_data && <Badge variant="critical">Special Cat.</Badge>}
            {stage.third_party_agreement && <Badge variant="active">Agreement ✓</Badge>}
            {stage.owner_name && <span>Owner: {stage.owner_name}</span>}
          </div>

          {/* GDPR requirements */}
          {gdprReqs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">GDPR Requirements</h4>
              <div className="space-y-2">
                {gdprReqs.map(r => <RequirementRow key={r.id} req={r} />)}
              </div>
            </div>
          )}

          {/* DPDPA requirements */}
          {dpdpaReqs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-2">DPDPA (India) Requirements</h4>
              <div className="space-y-2">
                {dpdpaReqs.map(r => <RequirementRow key={r.id} req={r} />)}
              </div>
            </div>
          )}

          {stage.compliance_notes && (
            <p className="text-xs text-muted-foreground border-t pt-2">{stage.compliance_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DataFlowDetailPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editStage, setEditStage] = useState<DataLifecycleStage | undefined>();

  const { data: flow, isLoading } = useDataFlow(flowId ?? "");
  const { data: stages = [], isLoading: stagesLoading } = useDataFlowLifecycleStages(flowId ?? "");
  const deleteStage = useDeleteLifecycleStage();

  const usedStages = stages.map(s => s.stage);
  const allStagesDone = usedStages.length === 6;

  function openAddStage() { setEditStage(undefined); setStageModalOpen(true); }
  function openEditStage(s: DataLifecycleStage) { setEditStage(s); setStageModalOpen(true); }
  function handleDelete(id: string) {
    if (confirm("Delete this lifecycle stage and its compliance data?")) deleteStage.mutate(id);
  }

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  if (!flow) return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Data flow not found.</div>;

  const overallNotMet  = stages.filter(s => s.compliance_status === "not_met").length;
  const overallMet     = stages.filter(s => s.compliance_status === "met").length;
  const privacyRisks   = stages.flatMap(s => s.requirements.filter(r => r.privacy_risk));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/assets?tab=data_flows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{flow.name}</h1>
            {flow.is_cross_border && <Badge variant="high">Cross-Border</Badge>}
            {flow.special_category_data && <Badge variant="critical">Special Category</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {flow.source_asset_name} → {flow.destination_asset_name}
          </p>
        </div>
        {!allStagesDone && (
          <Button onClick={openAddStage}>
            <Plus className="h-4 w-4" /> Add Lifecycle Stage
          </Button>
        )}
      </div>

      {/* Flow Overview Card */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Flow Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
          {flow.legal_basis && <div><span className="text-muted-foreground">Legal Basis: </span>{flow.legal_basis}</div>}
          {flow.lifecycle_stage && <div><span className="text-muted-foreground">Primary Stage: </span>{flow.lifecycle_stage_display ?? flow.lifecycle_stage}</div>}
          {flow.processing_activity_name && (
            <div><span className="text-muted-foreground">RoPA Activity: </span>{flow.processing_activity_name}</div>
          )}
          {flow.retention_period_days != null && (
            <div><span className="text-muted-foreground">Retention: </span>{flow.retention_period_days} days</div>
          )}
          {flow.data_types && <div><span className="text-muted-foreground">Data Types: </span>{flow.data_types}</div>}
          {flow.transfer_mechanism && <div><span className="text-muted-foreground">Transfer: </span>{flow.transfer_mechanism}</div>}
          {flow.data_subject_categories && <div><span className="text-muted-foreground">Data Subjects: </span>{flow.data_subject_categories}</div>}
          {flow.personal_data_categories && <div><span className="text-muted-foreground">Personal Data: </span>{flow.personal_data_categories}</div>}
          {flow.transfer_safeguards && <div><span className="text-muted-foreground">Safeguards: </span>{flow.transfer_safeguards}</div>}
        </div>
        {flow.notes && <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{flow.notes}</p>}
      </div>

      {/* Compliance Summary */}
      {stages.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Stages Defined", value: stages.length, cls: "text-foreground" },
            { label: "Stages Met", value: overallMet, cls: "text-green-700" },
            { label: "Stages Not Met", value: overallNotMet, cls: "text-red-700" },
            { label: "Privacy Risks Created", value: privacyRisks.length, cls: "text-purple-700" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-lg border bg-card p-4 text-center">
              <div className={cn("text-2xl font-bold", cls)}>{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Lifecycle Stages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Data Lifecycle Compliance</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="font-bold text-blue-700">GDPR</span></span>
            <span>+</span>
            <span className="flex items-center gap-1"><span className="font-bold text-orange-700">DPDPA</span></span>
          </div>
        </div>

        {stagesLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : stages.length === 0 ? (
          <div className="py-16 text-center border rounded-lg text-muted-foreground">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No lifecycle stages defined yet.</p>
            <p className="text-xs mt-1">Add stages to track GDPR & DPDPA compliance for each phase of the data lifecycle.</p>
            <Button className="mt-4" onClick={openAddStage}><Plus className="h-4 w-4" /> Add First Stage</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stage order: collection → processing → storage → sharing → archival → deletion */}
            {["collection","processing","storage","sharing","archival","deletion"].map(stageKey => {
              const s = stages.find(st => st.stage === stageKey);
              if (!s) return null;
              return (
                <StageCard key={s.id} stage={s} flowId={flowId!} usedStages={usedStages}
                  onEdit={openEditStage} onDelete={handleDelete} />
              );
            })}
          </div>
        )}
      </div>

      {/* Privacy Risks */}
      {privacyRisks.length > 0 && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600" /> Privacy Risks Created ({privacyRisks.length})
          </h2>
          <div className="space-y-1">
            {privacyRisks.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="flex-1">{r.requirement_label} <span className="text-muted-foreground text-xs">({r.article_reference})</span></span>
                <Link to="/risks" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View Risk <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <StageFormModal
        open={stageModalOpen}
        onClose={() => { setStageModalOpen(false); setEditStage(undefined); }}
        flowId={flowId!}
        editData={editStage}
        usedStages={usedStages}
      />
    </div>
  );
}
