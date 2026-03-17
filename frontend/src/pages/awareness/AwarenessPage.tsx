import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ChevronRight, BookOpen, Users } from "lucide-react";
import {
  useAwarenessPrograms,
  useCreateAwarenessProgram,
  useUpdateAwarenessProgram,
  useDeleteAwarenessProgram,
  useAwarenessAssignments,
  useCreateAwarenessAssignment,
} from "@/api/awareness";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AwarenessProgram {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  is_recurring: boolean;
  recurrence_months?: number | null;
  pass_score: number;
}

interface AwarenessAssignment {
  id: string;
  program: string;
  program_title?: string;
  user: string;
  user_display_name?: string;
  user_email?: string;
  due_date?: string | null;
  completed_at?: string | null;
  score?: number | null;
  passed?: boolean | null;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const programSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
  is_recurring: z.boolean(),
  recurrence_months: z.coerce.number().int().min(1).nullable().optional(),
  pass_score: z.coerce.number().int().min(0).max(100),
});
type ProgramFormValues = z.infer<typeof programSchema>;

const assignmentSchema = z.object({
  program: z.string().min(1, "Program is required"),
  user: z.string().min(1, "User is required"),
  due_date: z.string().optional(),
});
type AssignmentFormValues = z.infer<typeof assignmentSchema>;

// ─── Program Form Modal ───────────────────────────────────────────────────────

function ProgramFormModal({
  open, onClose, editData,
}: { open: boolean; onClose: () => void; editData?: AwarenessProgram }) {
  const create = useCreateAwarenessProgram();
  const update = useUpdateAwarenessProgram(editData?.id ?? "");

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<ProgramFormValues>({
      resolver: zodResolver(programSchema),
      defaultValues: editData
        ? {
            title: editData.title,
            description: editData.description ?? "",
            is_active: editData.is_active,
            is_recurring: editData.is_recurring,
            recurrence_months: editData.recurrence_months ?? undefined,
            pass_score: editData.pass_score,
          }
        : { title: "", description: "", is_active: true, is_recurring: false, pass_score: 80 },
    });

  const isRecurring = watch("is_recurring");

  async function onSubmit(values: ProgramFormValues) {
    const payload: Record<string, unknown> = {
      ...values,
      recurrence_months: values.is_recurring ? (values.recurrence_months ?? null) : null,
    };
    if (editData) await update.mutateAsync(payload);
    else await create.mutateAsync(payload);
    reset(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Program" : "New Awareness Program"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" error={errors.title?.message} {...register("title")} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Pass Score (%)" type="number" min="0" max="100" {...register("pass_score")} />
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="prog-active" {...register("is_active")} className="rounded border-input" />
              <label htmlFor="prog-active" className="text-sm font-medium">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="prog-recurring" {...register("is_recurring")} className="rounded border-input" />
              <label htmlFor="prog-recurring" className="text-sm font-medium">Recurring</label>
            </div>
          </div>
        </div>
        {isRecurring && (
          <Input label="Recurrence (months)" type="number" min="1" {...register("recurrence_months")} />
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{editData ? "Save" : "Create Program"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Assignment Form Modal ────────────────────────────────────────────────────

function AssignmentFormModal({
  open, onClose, programs,
}: { open: boolean; onClose: () => void; programs: AwarenessProgram[] }) {
  const create = useCreateAwarenessAssignment();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<AssignmentFormValues>({
      resolver: zodResolver(assignmentSchema),
      defaultValues: { program: "", user: "", due_date: "" },
    });

  async function onSubmit(values: AssignmentFormValues) {
    await create.mutateAsync({ ...values, due_date: values.due_date || null });
    reset(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign Program" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Program <span className="text-destructive">*</span>
          </label>
          <select
            {...register("program")}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring",
              errors.program && "border-destructive"
            )}
          >
            <option value="">Select a program...</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {errors.program && <p className="text-xs text-destructive mt-1">{errors.program.message}</p>}
        </div>
        <Input
          label="User ID *"
          placeholder="User UUID"
          error={errors.user?.message}
          {...register("user")}
        />
        <Input label="Due Date" type="date" {...register("due_date")} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Assign</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "programs" | "assignments";

export default function AwarenessPage() {
  const [tab, setTab] = useState<Tab>("programs");
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<AwarenessProgram | undefined>();
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  const { data: programsData, isLoading: programsLoading } = useAwarenessPrograms();
  const { data: assignmentsData, isLoading: assignmentsLoading } = useAwarenessAssignments();

  const programs: AwarenessProgram[] = programsData?.results ?? programsData ?? [];
  const assignments: AwarenessAssignment[] = assignmentsData?.results ?? assignmentsData ?? [];

  const deleteProgram = useDeleteAwarenessProgram();

  // Summary stats
  const totalAssignments = assignments.length;
  const completed = assignments.filter(a => !!a.completed_at).length;
  const passed = assignments.filter(a => a.passed === true).length;
  const overdue = assignments.filter(a =>
    a.due_date && !a.completed_at && a.due_date < new Date().toISOString().split("T")[0]
  ).length;

  const statCards = [
    { label: "Total Assignments", value: totalAssignments, color: "text-foreground" },
    { label: "Completed", value: completed, color: "text-green-600" },
    { label: "Passed", value: passed, color: "text-blue-600" },
    { label: "Overdue", value: overdue, color: "text-red-600" },
  ];

  const assignmentColumns: Column<AwarenessAssignment>[] = [
    {
      key: "user_display_name",
      header: "User",
      render: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.user_display_name ?? row.user}</div>
          {row.user_email && <div className="text-muted-foreground text-xs">{row.user_email}</div>}
        </div>
      ),
    },
    {
      key: "program_title",
      header: "Program",
      render: (row) => <span className="text-sm">{row.program_title ?? row.program}</span>,
    },
    {
      key: "due_date",
      header: "Due Date",
      render: (row) => {
        if (!row.due_date) return <span className="text-muted-foreground">—</span>;
        const overdue = !row.completed_at && row.due_date < new Date().toISOString().split("T")[0];
        return <span className={overdue ? "text-red-600" : "text-muted-foreground"}>{row.due_date}</span>;
      },
    },
    {
      key: "completed_at",
      header: "Completed",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.completed_at ? new Date(row.completed_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "score",
      header: "Score",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.score != null ? `${row.score}%` : "—"}
        </span>
      ),
    },
    {
      key: "passed",
      header: "Result",
      render: (row) => {
        if (row.passed === null || row.passed === undefined) return <span className="text-muted-foreground">—</span>;
        return <Badge variant={row.passed ? "approved" : "destructive"}>{row.passed ? "Passed" : "Failed"}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Awareness"
        description="Manage awareness training programs and track employee completion."
        actions={
          tab === "programs" ? (
            <Button onClick={() => { setEditProgram(undefined); setProgramModalOpen(true); }}>
              <Plus className="h-4 w-4" /> New Program
            </Button>
          ) : (
            <Button onClick={() => setAssignmentModalOpen(true)}>
              <Plus className="h-4 w-4" /> Assign Program
            </Button>
          )
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: "programs" as Tab, label: "Programs", icon: BookOpen, count: programs.length },
          { id: "assignments" as Tab, label: "Assignments", icon: Users, count: assignments.length },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="ml-1 text-xs bg-muted rounded-full px-1.5">{count}</span>
          </button>
        ))}
      </div>

      {/* Programs tab */}
      {tab === "programs" && (
        <div className="space-y-2">
          {programsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No awareness programs yet.</p>
            </div>
          ) : (
            programs.map((prog) => {
              const isExpanded = expandedProgram === prog.id;
              const progAssignments = assignments.filter(a => a.program === prog.id);
              const progCompleted = progAssignments.filter(a => !!a.completed_at).length;

              return (
                <div key={prog.id}>
                  <div className={cn("border rounded-lg bg-card px-4 py-3 flex items-center gap-3", isExpanded && "rounded-b-none")}>
                    <button
                      className="flex items-center gap-2 flex-1 text-left"
                      onClick={() => setExpandedProgram(isExpanded ? null : prog.id)}
                    >
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                      <span className="font-medium">{prog.title}</span>
                      {!prog.is_active && <Badge variant="inactive">Inactive</Badge>}
                      {prog.is_recurring && (
                        <Badge variant="not_assessed">Recurring {prog.recurrence_months ? `/ ${prog.recurrence_months}mo` : ""}</Badge>
                      )}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Pass: {prog.pass_score}% · {progCompleted}/{progAssignments.length} done
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditProgram(prog); setProgramModalOpen(true); }}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this program?")) deleteProgram.mutate(prog.id); }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border rounded-b-lg bg-card p-4 border-t-0">
                      {prog.description && (
                        <p className="text-sm text-muted-foreground mb-3">{prog.description}</p>
                      )}
                      <div className="text-sm text-muted-foreground">
                        <p>Assignments: {progAssignments.length} · Completed: {progCompleted}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Assignments tab */}
      {tab === "assignments" && (
        <div>
          {assignmentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No assignments yet.</p>
            </div>
          ) : (
            <DataTable<AwarenessAssignment>
              data={assignments}
              columns={assignmentColumns}
              emptyMessage="No assignments found."
            />
          )}
        </div>
      )}

      <ProgramFormModal
        open={programModalOpen}
        onClose={() => { setProgramModalOpen(false); setEditProgram(undefined); }}
        editData={editProgram}
      />
      <AssignmentFormModal
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        programs={programs}
      />
    </div>
  );
}
