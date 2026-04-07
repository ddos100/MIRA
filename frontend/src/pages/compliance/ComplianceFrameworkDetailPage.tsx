import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Upload,
  ChevronRight,
  ChevronDown,
  Link2,
  FileText,
  Shield,
} from "lucide-react";
import {
  useFramework,
  useRequirements,
  useCreateRequirement,
  useUpdateRequirement,
  useDeleteRequirement,
  useRequirementLinkedPolicies,
  useRequirementLinkedControls,
  useRequirementMappings,
  useCreateRequirementMapping,
  useDeleteRequirementMapping,
  useFrameworks,
  type Requirement,
  type RequirementMapping,
} from "@/api/compliance";
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/api/core";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ImportModal } from "@/components/common/ImportModal";
import { cn } from "@/utils/cn";

// ─── Requirement Form ─────────────────────────────────────────────────────────

const reqSchema = z.object({
  ref_code: z.string().min(1, "Ref code is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  guidance: z.string().optional(),
  order: z.coerce.number().default(0),
  parent: z.string().nullable().optional(),
});
type ReqFormValues = z.infer<typeof reqSchema>;

function RequirementFormModal({
  open,
  onClose,
  frameworkId,
  editData,
  requirements,
}: {
  open: boolean;
  onClose: () => void;
  frameworkId: string;
  editData?: Requirement;
  requirements: Requirement[];
}) {
  const create = useCreateRequirement();
  const update = useUpdateRequirement(editData?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReqFormValues>({
    resolver: zodResolver(reqSchema),
    defaultValues: editData
      ? {
          ref_code: editData.ref_code,
          title: editData.title,
          description: editData.description ?? "",
          guidance: editData.guidance ?? "",
          order: editData.order,
          parent: editData.parent ?? null,
        }
      : { ref_code: "", title: "", description: "", guidance: "", order: 0, parent: null },
  });

  const onSubmit = async (values: ReqFormValues) => {
    const payload = {
      ...values,
      framework: frameworkId,
      parent: values.parent || null,
    };
    if (editData) {
      await update.mutateAsync(payload);
    } else {
      await create.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  const topLevel = requirements.filter((r) => !r.parent && r.id !== editData?.id);

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Requirement" : "Add Requirement"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Ref Code *</label>
            <Input {...register("ref_code")} placeholder="5.1" />
            {errors.ref_code && (
              <p className="mt-1 text-xs text-destructive">{errors.ref_code.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Order</label>
            <Input type="number" {...register("order")} />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <Input {...register("title")} placeholder="Requirement title" />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Parent (optional)</label>
            <select {...register("parent")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— Top level —</option>
              {topLevel.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.ref_code} – {r.title}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea {...register("description")} rows={3} />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Guidance / Implementation Notes</label>
            <Textarea {...register("guidance")} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {editData ? "Save Changes" : "Add Requirement"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Mapping Modal ────────────────────────────────────────────────────────────

function MappingModal({
  open,
  onClose,
  sourceRequirementId,
  currentFrameworkId,
}: {
  open: boolean;
  onClose: () => void;
  sourceRequirementId: string;
  currentFrameworkId: string;
}) {
  const { data: allFrameworks } = useFrameworks();
  const [targetFrameworkId, setTargetFrameworkId] = useState("");
  const { data: targetReqs } = useRequirements(
    targetFrameworkId ? { framework: targetFrameworkId } : undefined
  );
  const [targetId, setTargetId] = useState("");
  const [relationship, setRelationship] = useState<RequirementMapping["relationship"]>("related");
  const [notes, setNotes] = useState("");
  const createMapping = useCreateRequirementMapping();

  const otherFrameworks = (allFrameworks?.results ?? []).filter(
    (fw) => fw.id !== currentFrameworkId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;
    await createMapping.mutateAsync({
      source: sourceRequirementId,
      target: targetId,
      relationship,
      notes,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Map to Another Framework Requirement">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Target Framework</label>
          <select value={targetFrameworkId} onChange={(e) => { setTargetFrameworkId(e.target.value); setTargetId(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select framework...</option>
            {otherFrameworks.map((fw) => (
              <option key={fw.id} value={fw.id}>{fw.short_name} {fw.version}</option>
            ))}
          </select>
        </div>
        {targetFrameworkId && (
          <div>
            <label className="mb-1 block text-sm font-medium">Target Requirement</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select requirement...</option>
              {(targetReqs?.results ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.ref_code} – {r.title}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">Relationship</label>
          <select value={relationship} onChange={(e) => setRelationship(e.target.value as RequirementMapping["relationship"])} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="equivalent">Equivalent</option>
            <option value="subset">Subset of</option>
            <option value="superset">Superset of</option>
            <option value="related">Related</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!targetId || createMapping.isPending}>Add Mapping</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Requirement Detail Panel ─────────────────────────────────────────────────

function RequirementPanel({
  requirement,
  frameworkId,
  onEdit,
  onDelete,
}: {
  requirement: Requirement;
  frameworkId: string;
  allRequirements?: Requirement[];
  onEdit: (r: Requirement) => void;
  onDelete: (r: Requirement) => void;
}) {
  const [tab, setTab] = useState<"details" | "mappings" | "policies" | "controls" | "files">("details");
  const [mappingOpen, setMappingOpen] = useState(false);

  const { data: mappings } = useRequirementMappings(requirement.id);
  const { data: policies } = useRequirementLinkedPolicies(requirement.id);
  const { data: controls } = useRequirementLinkedControls(requirement.id);
  const { data: attachments } = useAttachments("compliance.requirement", requirement.id);
  const uploadAttachment = useUploadAttachment("compliance.requirement", requirement.id);
  const deleteAttachment = useDeleteAttachment("compliance.requirement", requirement.id);
  const deleteMapping = useDeleteRequirementMapping();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadAttachment.mutateAsync({ file });
    e.target.value = "";
  };

  const tabs = [
    { key: "details" as const, label: "Details" },
    { key: "mappings" as const, label: `Mappings (${mappings?.length ?? 0})` },
    { key: "policies" as const, label: `Policies (${policies?.length ?? 0})` },
    { key: "controls" as const, label: `Controls (${controls?.length ?? 0})` },
    { key: "files" as const, label: `Files (${attachments?.length ?? 0})` },
  ];

  return (
    <div className="rounded-b-lg border-x border-b bg-muted/10 text-sm">
      {/* Tab Bar */}
      <div className="flex border-b bg-card">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={cn(
              "px-4 py-2 text-xs font-medium transition-colors",
              tab === t.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 px-2">
          <Button size="sm" variant="ghost" onClick={() => onEdit(requirement)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(requirement)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {/* Details */}
        {tab === "details" && (
          <div className="space-y-3">
            {requirement.description && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                <p className="text-sm leading-relaxed">{requirement.description}</p>
              </div>
            )}
            {requirement.guidance && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Guidance</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{requirement.guidance}</p>
              </div>
            )}
            {!requirement.description && !requirement.guidance && (
              <p className="text-muted-foreground">No details available.</p>
            )}
          </div>
        )}

        {/* Mappings */}
        {tab === "mappings" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setMappingOpen(true)}>
                <Link2 className="h-3.5 w-3.5" />
                Add Mapping
              </Button>
            </div>
            {mappings && mappings.length > 0 ? (
              <div className="space-y-2">
                {mappings.map((m) => {
                  const isSource = m.source === requirement.id;
                  const other = isSource
                    ? { ref: m.target_ref, title: m.target_title, fw: m.target_framework }
                    : { ref: m.source_ref, title: m.source_title, fw: m.source_framework };
                  return (
                    <div key={m.id} className="flex items-start justify-between rounded-md border bg-card px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="font-medium">
                          <Badge variant="outline" className="mr-2 text-xs">{other.fw}</Badge>
                          {other.ref} – {other.title}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{m.relationship.replace("_", " ")}</p>
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMapping.mutate(m.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No mappings yet.</p>
            )}
            <MappingModal
              open={mappingOpen}
              onClose={() => setMappingOpen(false)}
              sourceRequirementId={requirement.id}
              currentFrameworkId={frameworkId}
            />
          </div>
        )}

        {/* Linked Policies */}
        {tab === "policies" && (
          <div className="space-y-2">
            {policies && policies.length > 0 ? (
              policies.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{p.title}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{p.status}</Badge>
                  <span className="text-xs text-muted-foreground">v{p.version}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No policies linked to this requirement.</p>
            )}
          </div>
        )}

        {/* Linked Controls */}
        {tab === "controls" && (
          <div className="space-y-2">
            {controls && controls.length > 0 ? (
              controls.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{c.title}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{c.control_type}</Badge>
                  <Badge variant="outline" className="text-xs">{c.status}</Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No controls linked to this requirement.</p>
            )}
          </div>
        )}

        {/* File Attachments */}
        {tab === "files" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleFileUpload} />
                <span className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" />
                  Upload File
                </span>
              </label>
            </div>
            {attachments && attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                    <div>
                      <a
                        href={att.file}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {att.filename}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {(att.file_size / 1024).toFixed(1)} KB · {att.mime_type}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAttachment.mutate(att.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No files attached.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Requirement Row ──────────────────────────────────────────────────────────

function RequirementRow({
  requirement,
  frameworkId,
  allRequirements,
  onEdit,
  onDelete,
  depth,
}: {
  requirement: Requirement;
  frameworkId: string;
  allRequirements: Requirement[];
  onEdit: (r: Requirement) => void;
  onDelete: (r: Requirement) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = allRequirements.filter((r) => r.parent === requirement.id);
  const d = depth ?? 0;

  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors last:border-0 hover:bg-muted/20",
          expanded && "bg-muted/10"
        )}
      >
        <td className="px-4 py-3">
          <button
            className="flex items-center gap-1 text-left font-medium text-foreground"
            style={{ paddingLeft: `${d * 20}px` }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <Badge variant="outline" className="mr-1 text-xs font-mono">
              {requirement.ref_code}
            </Badge>
            <span className="text-sm">{requirement.title}</span>
          </button>
        </td>
        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
          {(requirement as Requirement & { policies_count?: number }).policies_count ?? 0}
        </td>
        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
          {(requirement as Requirement & { controls_count?: number }).controls_count ?? 0}
        </td>
        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
          {(requirement as Requirement & { mappings_count?: number }).mappings_count ?? 0}
        </td>
      </tr>

      {/* Expandable detail panel */}
      {expanded && (
        <tr>
          <td colSpan={4} className="p-0">
            <RequirementPanel
              requirement={requirement}
              frameworkId={frameworkId}
              allRequirements={allRequirements}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </td>
        </tr>
      )}

      {/* Children (indented) */}
      {expanded &&
        children.map((child) => (
          <RequirementRow
            key={child.id}
            requirement={child}
            frameworkId={frameworkId}
            allRequirements={allRequirements}
            onEdit={onEdit}
            onDelete={onDelete}
            depth={d + 1}
          />
        ))}
    </>
  );
}

// ─── CSV Template for requirements ───────────────────────────────────────────

const REQ_CSV_TEMPLATE =
  "framework,ref_code,title,description,guidance,order,parent";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ComplianceFrameworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editReq, setEditReq] = useState<Requirement | undefined>();

  const { data: framework, isLoading: fwLoading } = useFramework(id ?? "");
  const { data: reqData, isLoading: reqLoading } = useRequirements(
    id ? { framework: id } : undefined
  );
  const allRequirements: Requirement[] = reqData?.results ?? [];
  const topLevel = allRequirements.filter((r) => !r.parent);
  const deleteRequirement = useDeleteRequirement();

  const handleDeleteReq = async (r: Requirement) => {
    if (!confirm(`Delete requirement "${r.ref_code}: ${r.title}"?`)) return;
    await deleteRequirement.mutateAsync(r.id);
  };

  if (fwLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Framework not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/compliance/frameworks")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Frameworks
          </button>
          <h1 className="text-2xl font-bold">{framework.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{framework.short_name}</Badge>
            {framework.version && <span>v{framework.version}</span>}
            {framework.issuing_body && <span>· {framework.issuing_body}</span>}
            <Badge variant={framework.is_active ? "active" : "inactive"}>
              {framework.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {framework.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {framework.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import Requirements
          </Button>
          <Button
            onClick={() => {
              setEditReq(undefined);
              setReqModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Requirement
          </Button>
        </div>
      </div>

      {/* Requirements Table */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">
            Requirements
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({allRequirements.length})
            </span>
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Requirement</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Policies</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Controls</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Mappings</th>
            </tr>
          </thead>
          <tbody>
            {reqLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : topLevel.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-muted-foreground">
                  No requirements yet. Add one or import via CSV.
                </td>
              </tr>
            ) : (
              topLevel.map((req) => (
                <RequirementRow
                  key={req.id}
                  requirement={req}
                  frameworkId={framework.id}
                  allRequirements={allRequirements}
                  onEdit={(r) => {
                    setEditReq(r);
                    setReqModalOpen(true);
                  }}
                  onDelete={handleDeleteReq}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <RequirementFormModal
        open={reqModalOpen}
        onClose={() => {
          setReqModalOpen(false);
          setEditReq(undefined);
        }}
        frameworkId={framework.id}
        editData={editReq}
        requirements={allRequirements}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/compliance/requirements/import-csv/"
        title="Import Requirements"
        description="Upload a CSV to bulk-add requirements. The 'framework' column should contain the framework UUID."
        templateCsv={REQ_CSV_TEMPLATE}
        templateFilename="requirements-template.csv"
        extraNote={`Framework ID for "${framework.name}": ${framework.id}`}
      />
    </div>
  );
}
