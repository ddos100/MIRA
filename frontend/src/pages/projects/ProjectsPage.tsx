import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, FolderOpen, ChevronRight, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, useProjectTasks, useCreateProjectTask, useUpdateProjectTask, useDeleteProjectTask } from "@/api/projects";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  owner_name?: string;
}

interface ProjectTask {
  id: string;
  project: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  due_date?: string | null;
  assignee_name?: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const projectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["planned", "active", "on_hold", "completed", "cancelled"]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.coerce.number().nullable().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  due_date: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const projectStatusVariant: Record<string, string> = {
  planned: "not_assessed",
  active: "approved",
  on_hold: "medium",
  completed: "low",
  cancelled: "destructive",
};

const priorityVariant: Record<string, string> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const TaskIcon = ({ status }: { status: string }) => {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "blocked") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "in_progress") return <Clock className="h-4 w-4 text-yellow-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};

// ─── Project Form Modal ───────────────────────────────────────────────────────

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  editData?: Project;
}

function ProjectFormModal({ open, onClose, editData }: ProjectFormModalProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(editData?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: editData
      ? {
          title: editData.title,
          description: editData.description ?? "",
          status: editData.status as ProjectFormValues["status"],
          start_date: editData.start_date ?? "",
          end_date: editData.end_date ?? "",
          budget: editData.budget ?? undefined,
        }
      : { title: "", description: "", status: "planned", start_date: "", end_date: "" },
  });

  async function onSubmit(values: ProjectFormValues) {
    const payload: Record<string, unknown> = {
      ...values,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      budget: values.budget || null,
    };
    if (editData) await updateProject.mutateAsync(payload);
    else await createProject.mutateAsync(payload);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Project" : "New Project"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" placeholder="Project title" error={errors.title?.message} {...register("title")} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            options={[
              { value: "planned", label: "Planned" },
              { value: "active", label: "Active" },
              { value: "on_hold", label: "On Hold" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            {...register("status")}
          />
          <Input label="Budget ($)" type="number" min="0" step="0.01" {...register("budget")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date" type="date" {...register("start_date")} />
          <Input label="End Date" type="date" {...register("end_date")} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {editData ? "Save Changes" : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  editData?: ProjectTask;
}

function TaskFormModal({ open, onClose, projectId, editData }: TaskFormModalProps) {
  const createTask = useCreateProjectTask();
  const updateTask = useUpdateProjectTask(editData?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: editData
      ? {
          title: editData.title,
          description: editData.description ?? "",
          status: editData.status,
          priority: editData.priority,
          due_date: editData.due_date ?? "",
        }
      : { title: "", description: "", status: "todo", priority: "medium", due_date: "" },
  });

  async function onSubmit(values: TaskFormValues) {
    const payload: Record<string, unknown> = {
      ...values,
      project: projectId,
      due_date: values.due_date || null,
    };
    if (editData) await updateTask.mutateAsync(payload);
    else await createTask.mutateAsync(payload);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Task" : "Add Task"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" placeholder="Task title" error={errors.title?.message} {...register("title")} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            options={[
              { value: "todo", label: "To Do" },
              { value: "in_progress", label: "In Progress" },
              { value: "done", label: "Done" },
              { value: "blocked", label: "Blocked" },
            ]}
            {...register("status")}
          />
          <Select
            label="Priority"
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" },
            ]}
            {...register("priority")}
          />
        </div>
        <Input label="Due Date" type="date" {...register("due_date")} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {editData ? "Save Changes" : "Add Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Project Detail Panel ─────────────────────────────────────────────────────

interface ProjectDetailProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjectDetail({ project, onEdit, onDelete }: ProjectDetailProps) {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | undefined>();
  const deleteTask = useDeleteProjectTask();
  const { data: tasks = [], isLoading } = useProjectTasks(project.id);

  const taskList = tasks as ProjectTask[];
  const done = taskList.filter(t => t.status === "done").length;

  return (
    <div className="border rounded-lg bg-card mt-1 mb-3">
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
              {project.start_date && <span>Start: {project.start_date}</span>}
              {project.end_date && <span>End: {project.end_date}</span>}
              {project.budget != null && <span>Budget: ${Number(project.budget).toLocaleString()}</span>}
              {project.owner_name && <span>Owner: {project.owner_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (confirm("Delete this project?")) onDelete(); }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">
            Tasks
            {taskList.length > 0 && (
              <span className="ml-2 text-muted-foreground font-normal">
                {done}/{taskList.length} done
              </span>
            )}
          </h3>
          <Button size="sm" variant="outline" onClick={() => { setEditTask(undefined); setTaskModalOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-1">
            {[1, 2].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
          </div>
        ) : taskList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tasks yet.</p>
        ) : (
          <div className="space-y-1">
            {taskList.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 group"
              >
                <TaskIcon status={task.status} />
                <span className={cn("flex-1 text-sm", task.status === "done" && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
                <Badge variant={priorityVariant[task.priority] ?? "default"} className="text-xs">
                  {task.priority}
                </Badge>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground">{task.due_date}</span>
                )}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                  <button
                    onClick={() => { setEditTask(task); setTaskModalOpen(true); }}
                    className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this task?"))
                        deleteTask.mutate({ id: task.id, projectId: project.id });
                    }}
                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskFormModal
        open={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditTask(undefined); }}
        projectId={project.id}
        editData={editTask}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useProjects(statusFilter ? { status: statusFilter } : {});
  const projects: Project[] = data?.results ?? data ?? [];
  const deleteProject = useDeleteProject();

  const total = projects.length;
  const active = projects.filter(p => p.status === "active").length;
  const completed = projects.filter(p => p.status === "completed").length;
  const planned = projects.filter(p => p.status === "planned").length;

  const statCards = [
    { label: "Total", value: total, color: "text-foreground" },
    { label: "Active", value: active, color: "text-green-600" },
    { label: "Planned", value: planned, color: "text-blue-600" },
    { label: "Completed", value: completed, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage GRC projects and track their tasks."
        actions={
          <Button onClick={() => { setEditTarget(undefined); setModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No projects found. Create one to get started.</p>
        </div>
      ) : (
        <div>
          {projects.map((project) => (
            <div key={project.id}>
              <div className={cn("border rounded-lg bg-card", expandedId === project.id && "rounded-b-none border-b-0")}>
                <div className="px-4 py-3 flex items-center gap-4">
                  <button
                    className="flex items-center gap-1 font-medium text-foreground hover:underline flex-1 text-left"
                    onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                  >
                    <ChevronRight
                      className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", expandedId === project.id && "rotate-90")}
                    />
                    {project.title}
                  </button>
                  <Badge variant={projectStatusVariant[project.status] ?? "default"}>
                    {project.status.replace("_", " ")}
                  </Badge>
                  {project.owner_name && (
                    <span className="text-sm text-muted-foreground hidden md:block">{project.owner_name}</span>
                  )}
                  {project.end_date && (
                    <span className="text-sm text-muted-foreground hidden md:block">Due: {project.end_date}</span>
                  )}
                </div>
              </div>
              {expandedId === project.id && (
                <ProjectDetail
                  project={project}
                  onEdit={() => { setEditTarget(project); setModalOpen(true); }}
                  onDelete={() => deleteProject.mutate(project.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <ProjectFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(undefined); }}
        editData={editTarget}
      />
    </div>
  );
}
