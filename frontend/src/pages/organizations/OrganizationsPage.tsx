import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Building2, GitBranch, ChevronRight } from "lucide-react";
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useDeleteBusinessUnit,
  useBusinessProcesses,
  useCreateBusinessProcess,
  useUpdateBusinessProcess,
  useDeleteBusinessProcess,
} from "@/api/organizations";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessUnit {
  id: string;
  name: string;
  description?: string;
  code?: string;
  parent?: string | null;
  parent_name?: string;
  organization_head_name?: string;
  is_active: boolean;
  children_count?: number;
}

interface BusinessProcess {
  id: string;
  name: string;
  description?: string;
  business_unit: string;
  business_unit_name?: string;
  owner_name?: string;
  criticality: string;
  is_active: boolean;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const unitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  code: z.string().optional(),
  parent: z.string().nullable().optional(),
  is_active: z.boolean(),
});

type UnitFormValues = z.infer<typeof unitSchema>;

const processSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  business_unit: z.string().min(1, "Business unit is required"),
  criticality: z.enum(["low", "medium", "high", "critical"]),
  is_active: z.boolean(),
});

type ProcessFormValues = z.infer<typeof processSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const criticalityVariant: Record<string, string> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

// ─── Business Unit Form Modal ─────────────────────────────────────────────────

interface UnitFormModalProps {
  open: boolean;
  onClose: () => void;
  editData?: BusinessUnit;
  units: BusinessUnit[];
}

function UnitFormModal({ open, onClose, editData, units }: UnitFormModalProps) {
  const createUnit = useCreateBusinessUnit();
  const updateUnit = useUpdateBusinessUnit(editData?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: editData
      ? {
          name: editData.name,
          description: editData.description ?? "",
          code: editData.code ?? "",
          parent: editData.parent ?? null,
          is_active: editData.is_active,
        }
      : { name: "", description: "", code: "", parent: null, is_active: true },
  });

  async function onSubmit(values: UnitFormValues) {
    const payload: Record<string, unknown> = { ...values, parent: values.parent || null };
    if (editData) await updateUnit.mutateAsync(payload);
    else await createUnit.mutateAsync(payload);
    reset();
    onClose();
  }

  const availableParents = units.filter(u => u.id !== editData?.id);

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Business Unit" : "New Business Unit"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name *" placeholder="Business unit name" error={errors.name?.message} {...register("name")} />
        <Input label="Code" placeholder="e.g. IT, HR, FIN" {...register("code")} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Parent Unit</label>
          <select
            {...register("parent")}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— No parent (top level) —</option>
            {availableParents.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="unit-active" {...register("is_active")} className="rounded border-input" />
          <label htmlFor="unit-active" className="text-sm font-medium text-foreground">Active</label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {editData ? "Save Changes" : "Create Unit"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Business Process Form Modal ──────────────────────────────────────────────

interface ProcessFormModalProps {
  open: boolean;
  onClose: () => void;
  editData?: BusinessProcess;
  units: BusinessUnit[];
}

function ProcessFormModal({ open, onClose, editData, units }: ProcessFormModalProps) {
  const createProcess = useCreateBusinessProcess();
  const updateProcess = useUpdateBusinessProcess(editData?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: editData
      ? {
          name: editData.name,
          description: editData.description ?? "",
          business_unit: editData.business_unit,
          criticality: editData.criticality as ProcessFormValues["criticality"],
          is_active: editData.is_active,
        }
      : { name: "", description: "", business_unit: "", criticality: "medium", is_active: true },
  });

  async function onSubmit(values: ProcessFormValues) {
    if (editData) await updateProcess.mutateAsync(values);
    else await createProcess.mutateAsync(values);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Business Process" : "New Business Process"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name *" placeholder="Process name" error={errors.name?.message} {...register("name")} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Business Unit <span className="text-destructive">*</span>
          </label>
          <select
            {...register("business_unit")}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring",
              errors.business_unit && "border-destructive"
            )}
          >
            <option value="">Select a business unit...</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {errors.business_unit && (
            <p className="text-xs text-destructive mt-1">{errors.business_unit.message}</p>
          )}
        </div>
        <Select
          label="Criticality"
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "critical", label: "Critical" },
          ]}
          {...register("criticality")}
        />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="process-active" {...register("is_active")} className="rounded border-input" />
          <label htmlFor="process-active" className="text-sm font-medium text-foreground">Active</label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {editData ? "Save Changes" : "Create Process"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "units" | "processes";

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

  const processesForUnit = (unitId: string) =>
    processes.filter(p => p.business_unit === unitId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage business units and their processes."
        actions={
          tab === "units" ? (
            <Button onClick={() => { setEditUnit(undefined); setUnitModalOpen(true); }}>
              <Plus className="h-4 w-4" />
              New Business Unit
            </Button>
          ) : (
            <Button onClick={() => { setEditProcess(undefined); setProcessModalOpen(true); }}>
              <Plus className="h-4 w-4" />
              New Business Process
            </Button>
          )
        }
      />

      {/* Tab bar */}
      <div className="flex border-b">
        <button
          onClick={() => setTab("units")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "units"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="h-4 w-4" />
          Business Units
          <span className="ml-1 text-xs bg-muted rounded-full px-1.5">{units.length}</span>
        </button>
        <button
          onClick={() => setTab("processes")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "processes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <GitBranch className="h-4 w-4" />
          Business Processes
          <span className="ml-1 text-xs bg-muted rounded-full px-1.5">{processes.length}</span>
        </button>
      </div>

      {/* ── Business Units Tab ── */}
      {tab === "units" && (
        <div className="space-y-2">
          {unitsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : units.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No business units found. Create one to get started.</p>
            </div>
          ) : (
            units.map((unit) => {
              const unitProcesses = processesForUnit(unit.id);
              const isExpanded = expandedUnit === unit.id;
              return (
                <div key={unit.id} className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <ChevronRight
                        className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-90")}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{unit.name}</span>
                          {unit.code && (
                            <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                              {unit.code}
                            </span>
                          )}
                          {!unit.is_active && (
                            <Badge variant="inactive">Inactive</Badge>
                          )}
                        </div>
                        {unit.parent_name && (
                          <p className="text-xs text-muted-foreground">Parent: {unit.parent_name}</p>
                        )}
                      </div>
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {unitProcesses.length} process{unitProcesses.length !== 1 ? "es" : ""}
                    </span>
                    {unit.organization_head_name && (
                      <span className="text-sm text-muted-foreground hidden md:block">
                        Head: {unit.organization_head_name}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditUnit(unit); setUnitModalOpen(true); }}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this business unit?")) deleteUnit.mutate(unit.id);
                        }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-muted/20">
                      {unit.description && (
                        <p className="text-sm text-muted-foreground mb-3">{unit.description}</p>
                      )}
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Processes ({unitProcesses.length})
                      </h4>
                      {unitProcesses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No processes in this unit.</p>
                      ) : (
                        <div className="space-y-1">
                          {unitProcesses.map(p => (
                            <div key={p.id} className="flex items-center gap-2 text-sm">
                              <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{p.name}</span>
                              <Badge variant={criticalityVariant[p.criticality] ?? "default"}>
                                {p.criticality}
                              </Badge>
                              {!p.is_active && <Badge variant="inactive">Inactive</Badge>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Business Processes Tab ── */}
      {tab === "processes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={critFilter}
              onChange={(e) => setCritFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Criticalities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {processesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
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
                  {processes.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.business_unit_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={criticalityVariant[p.criticality] ?? "default"}>
                          {p.criticality.charAt(0).toUpperCase() + p.criticality.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.owner_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.is_active ? "active" : "inactive"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setEditProcess(p); setProcessModalOpen(true); }}
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this business process?")) deleteProcess.mutate(p.id);
                            }}
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
          )}
        </div>
      )}

      <UnitFormModal
        open={unitModalOpen}
        onClose={() => { setUnitModalOpen(false); setEditUnit(undefined); }}
        editData={editUnit}
        units={units}
      />

      <ProcessFormModal
        open={processModalOpen}
        onClose={() => { setProcessModalOpen(false); setEditProcess(undefined); }}
        editData={editProcess}
        units={units}
      />
    </div>
  );
}
