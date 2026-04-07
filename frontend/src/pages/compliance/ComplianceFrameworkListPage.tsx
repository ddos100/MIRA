import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ChevronRight, Upload } from "lucide-react";
import {
  useFrameworks,
  useCreateFramework,
  useUpdateFramework,
  useDeleteFramework,
  type ComplianceFramework,
} from "@/api/compliance";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ImportModal } from "@/components/common/ImportModal";

// ─── Schema ───────────────────────────────────────────────────────────────────

const frameworkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  short_name: z.string().min(1, "Short name is required"),
  version: z.string().optional(),
  description: z.string().optional(),
  issuing_body: z.string().optional(),
  is_active: z.boolean().default(true),
});
type FrameworkFormValues = z.infer<typeof frameworkSchema>;

// ─── Form Modal ───────────────────────────────────────────────────────────────

function FrameworkFormModal({
  open,
  onClose,
  editData,
}: {
  open: boolean;
  onClose: () => void;
  editData?: ComplianceFramework;
}) {
  const create = useCreateFramework();
  const update = useUpdateFramework(editData?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FrameworkFormValues>({
    resolver: zodResolver(frameworkSchema),
    defaultValues: editData
      ? {
          name: editData.name,
          short_name: editData.short_name,
          version: editData.version ?? "",
          description: editData.description ?? "",
          issuing_body: editData.issuing_body ?? "",
          is_active: editData.is_active,
        }
      : { name: "", short_name: "", version: "", description: "", issuing_body: "", is_active: true },
  });

  const onSubmit = async (values: FrameworkFormValues) => {
    if (editData) {
      await update.mutateAsync(values);
    } else {
      await create.mutateAsync(values);
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? "Edit Framework" : "New Framework"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input {...register("name")} placeholder="ISO/IEC 27001:2022" />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Short Name *</label>
            <Input {...register("short_name")} placeholder="ISO 27001" />
            {errors.short_name && (
              <p className="mt-1 text-xs text-destructive">{errors.short_name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Version</label>
            <Input {...register("version")} placeholder="2022" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Issuing Body</label>
            <Input {...register("issuing_body")} placeholder="ISO/IEC" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea {...register("description")} rows={3} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register("is_active")} className="h-4 w-4" />
            <label htmlFor="is_active" className="text-sm">Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {editData ? "Save Changes" : "Create Framework"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── CSV Template ─────────────────────────────────────────────────────────────

const FRAMEWORK_CSV_TEMPLATE = "name,short_name,version,description,issuing_body,is_active";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ComplianceFrameworkListPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ComplianceFramework | undefined>();

  const { data, isLoading, isError } = useFrameworks();
  const frameworks: ComplianceFramework[] = data?.results ?? [];
  const deleteFramework = useDeleteFramework();

  const handleEdit = (fw: ComplianceFramework) => {
    setEditTarget(fw);
    setModalOpen(true);
  };

  const handleDelete = async (fw: ComplianceFramework) => {
    if (!confirm(`Delete "${fw.name}"? This will also delete all its requirements.`)) return;
    await deleteFramework.mutateAsync(fw.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load compliance frameworks.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Frameworks"
        description="Standards and regulations available for compliance programs."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditTarget(undefined);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New Framework
            </Button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Short Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Version</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issuing Body</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Requirements</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {frameworks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No frameworks found. Create one or import via CSV.
                </td>
              </tr>
            ) : (
              frameworks.map((fw) => (
                <tr
                  key={fw.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <button
                      className="flex items-center gap-1 font-medium text-foreground hover:underline"
                      onClick={() => navigate(`/compliance/frameworks/${fw.id}`)}
                    >
                      {fw.name}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{fw.short_name}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fw.version || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fw.issuing_body || "—"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {(fw as ComplianceFramework & { requirements_count?: number }).requirements_count ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {fw.is_active ? (
                      <Badge variant="active">Active</Badge>
                    ) : (
                      <Badge variant="inactive">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(fw)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(fw)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FrameworkFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(undefined);
        }}
        editData={editTarget}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/compliance/frameworks/import-csv/"
        title="Import Frameworks"
        description="Upload a CSV file to bulk-create compliance frameworks."
        templateCsv={FRAMEWORK_CSV_TEMPLATE}
        templateFilename="frameworks-template.csv"
      />
    </div>
  );
}
