import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, ChevronRight,
  FileText, Send,
} from "lucide-react";
import {
  useAssessmentTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate,
  useTemplateQuestions, useCreateQuestion, useDeleteQuestion,
  useAssessments, useCreateAssessment, useDeleteAssessment,
} from "@/api/assessments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  questions_count?: number;
}

interface Question {
  id: string;
  template: string;
  text: string;
  question_type: string;
  is_required: boolean;
  order: number;
}

interface Assessment {
  id: string;
  template: string;
  template_title?: string;
  title: string;
  respondent_name?: string;
  respondent_email?: string;
  status: string;
  due_date?: string | null;
  total_score?: number | null;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const templateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
});
type TemplateFormValues = z.infer<typeof templateSchema>;

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  question_type: z.enum(["text", "textarea", "mcq", "scale", "yes_no", "file"]),
  is_required: z.boolean(),
  order: z.coerce.number().int().min(0),
  weight: z.coerce.number().min(0),
});
type QuestionFormValues = z.infer<typeof questionSchema>;

const assessmentSchema = z.object({
  template: z.string().min(1, "Template is required"),
  title: z.string().min(1, "Title is required"),
  respondent_name: z.string().optional(),
  respondent_email: z.string().optional(),
  status: z.enum(["draft", "sent", "in_progress", "completed", "expired"]),
  due_date: z.string().optional(),
});
type AssessmentFormValues = z.infer<typeof assessmentSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusVariant: Record<string, string> = {
  draft: "not_assessed",
  sent: "in_progress",
  in_progress: "medium",
  completed: "approved",
  expired: "destructive",
};

const questionTypeLabel: Record<string, string> = {
  text: "Text",
  textarea: "Long Text",
  mcq: "Multiple Choice",
  scale: "Scale 1–5",
  yes_no: "Yes/No",
  file: "File Upload",
};

// ─── Template Form Modal ──────────────────────────────────────────────────────

function TemplateFormModal({
  open, onClose, editData,
}: { open: boolean; onClose: () => void; editData?: Template }) {
  const create = useCreateTemplate();
  const update = useUpdateTemplate(editData?.id ?? "");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<TemplateFormValues>({
      resolver: zodResolver(templateSchema),
      defaultValues: editData
        ? { title: editData.title, description: editData.description ?? "", is_active: editData.is_active }
        : { title: "", description: "", is_active: true },
    });

  async function onSubmit(values: TemplateFormValues) {
    if (editData) await update.mutateAsync(values);
    else await create.mutateAsync(values);
    reset(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editData ? "Edit Template" : "New Template"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" error={errors.title?.message} {...register("title")} />
        <Textarea label="Description" rows={3} {...register("description")} />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="tmpl-active" {...register("is_active")} className="rounded border-input" />
          <label htmlFor="tmpl-active" className="text-sm font-medium">Active</label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>{editData ? "Save" : "Create Template"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Question Form Modal ──────────────────────────────────────────────────────

function QuestionFormModal({
  open, onClose, templateId, nextOrder,
}: { open: boolean; onClose: () => void; templateId: string; nextOrder: number }) {
  const create = useCreateQuestion();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<QuestionFormValues>({
      resolver: zodResolver(questionSchema),
      defaultValues: { text: "", question_type: "text", is_required: true, order: nextOrder, weight: 1 },
    });

  async function onSubmit(values: QuestionFormValues) {
    await create.mutateAsync({ ...values, template: templateId, options: [] });
    reset(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Question" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Textarea label="Question Text *" rows={2} error={errors.text?.message} {...register("text")} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Type" options={[
            { value: "text", label: "Text" },
            { value: "textarea", label: "Long Text" },
            { value: "mcq", label: "Multiple Choice" },
            { value: "scale", label: "Scale 1–5" },
            { value: "yes_no", label: "Yes/No" },
            { value: "file", label: "File Upload" },
          ]} {...register("question_type")} />
          <Input label="Weight" type="number" min="0" step="0.1" {...register("weight")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Order" type="number" min="0" {...register("order")} />
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="q-required" {...register("is_required")} className="rounded border-input" />
            <label htmlFor="q-required" className="text-sm font-medium">Required</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Add Question</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Assessment Form Modal ─────────────────────────────────────────────────────

function AssessmentFormModal({
  open, onClose, templates,
}: { open: boolean; onClose: () => void; templates: Template[] }) {
  const create = useCreateAssessment();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<AssessmentFormValues>({
      resolver: zodResolver(assessmentSchema),
      defaultValues: { template: "", title: "", respondent_name: "", respondent_email: "", status: "draft", due_date: "" },
    });

  async function onSubmit(values: AssessmentFormValues) {
    await create.mutateAsync({ ...values, due_date: values.due_date || null });
    reset(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Assessment" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Template <span className="text-destructive">*</span>
          </label>
          <select
            {...register("template")}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring",
              errors.template && "border-destructive"
            )}
          >
            <option value="">Select a template...</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {errors.template && <p className="text-xs text-destructive mt-1">{errors.template.message}</p>}
        </div>
        <Input label="Title *" error={errors.title?.message} {...register("title")} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Respondent Name" {...register("respondent_name")} />
          <Input label="Respondent Email" type="email" {...register("respondent_email")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Status" options={[
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
            { value: "expired", label: "Expired" },
          ]} {...register("status")} />
          <Input label="Due Date" type="date" {...register("due_date")} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Create Assessment</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Template Detail Panel ─────────────────────────────────────────────────────

function TemplateDetail({ template, onEdit }: { template: Template; onEdit: () => void }) {
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const { data: questions = [], isLoading } = useTemplateQuestions(template.id);
  const deleteQuestion = useDeleteQuestion();
  const questionList = questions as Question[];

  return (
    <div className="border rounded-b-lg bg-card p-4 border-t-0">
      <div className="flex items-center justify-between mb-3">
        <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        <Button size="sm" variant="outline" onClick={() => setQuestionModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Question
        </Button>
      </div>
      {template.description && <p className="text-sm text-muted-foreground mb-3">{template.description}</p>}
      {isLoading ? (
        <div className="space-y-1">{[1, 2].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
      ) : questionList.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No questions yet.</p>
      ) : (
        <ol className="space-y-1">
          {questionList.map((q, idx) => (
            <li key={q.id} className="flex items-start gap-2 text-sm group px-2 py-1 rounded hover:bg-muted/40">
              <span className="text-muted-foreground shrink-0 w-5 text-right">{idx + 1}.</span>
              <span className="flex-1">{q.text}</span>
              <Badge variant="not_assessed" className="text-xs shrink-0">
                {questionTypeLabel[q.question_type] ?? q.question_type}
              </Badge>
              {q.is_required && <span className="text-destructive text-xs shrink-0">req</span>}
              <button
                onClick={() => { if (confirm("Delete this question?")) deleteQuestion.mutate({ id: q.id, templateId: template.id }); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <QuestionFormModal
        open={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        templateId={template.id}
        nextOrder={questionList.length}
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "templates" | "assessments";

export default function AssessmentsPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | undefined>();
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: templatesData, isLoading: templatesLoading } = useAssessmentTemplates();
  const { data: assessmentsData, isLoading: assessmentsLoading } = useAssessments(
    statusFilter ? { status: statusFilter } : {}
  );

  const templates: Template[] = templatesData?.results ?? templatesData ?? [];
  const assessments: Assessment[] = assessmentsData?.results ?? assessmentsData ?? [];
  const deleteTemplate = useDeleteTemplate();
  const deleteAssessment = useDeleteAssessment();

  const assessmentColumns: Column<Assessment>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "template_title",
      header: "Template",
      render: (row) => <span className="text-sm text-muted-foreground">{row.template_title ?? "—"}</span>,
    },
    {
      key: "respondent_name",
      header: "Respondent",
      render: (row) => (
        <div className="text-sm">
          <div>{row.respondent_name || "—"}</div>
          {row.respondent_email && <div className="text-muted-foreground text-xs">{row.respondent_email}</div>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <Badge variant={statusVariant[row.status] ?? "default"}>{row.status.replace("_", " ")}</Badge>,
    },
    {
      key: "due_date",
      header: "Due",
      render: (row) => <span className="text-sm text-muted-foreground">{row.due_date ?? "—"}</span>,
    },
    {
      key: "total_score",
      header: "Score",
      render: (row) => <span className="text-sm text-muted-foreground">{row.total_score != null ? String(row.total_score) : "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm("Delete this assessment?")) deleteAssessment.mutate(row.id); }}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Create questionnaire templates and send assessments to respondents."
        actions={
          tab === "templates" ? (
            <Button onClick={() => { setEditTemplate(undefined); setTemplateModalOpen(true); }}>
              <Plus className="h-4 w-4" /> New Template
            </Button>
          ) : (
            <Button onClick={() => setAssessmentModalOpen(true)}>
              <Plus className="h-4 w-4" /> New Assessment
            </Button>
          )
        }
      />

      <div className="flex border-b">
        {[
          { id: "templates" as Tab, label: "Templates", icon: FileText, count: templates.length },
          { id: "assessments" as Tab, label: "Assessments", icon: Send, count: assessments.length },
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

      {/* Templates tab */}
      {tab === "templates" && (
        <div className="space-y-2">
          {templatesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No templates yet. Create one to get started.</p>
            </div>
          ) : (
            templates.map((tmpl) => {
              const isExpanded = expandedTemplate === tmpl.id;
              return (
                <div key={tmpl.id}>
                  <div className={cn("border rounded-lg bg-card px-4 py-3 flex items-center gap-3", isExpanded && "rounded-b-none")}>
                    <button
                      className="flex items-center gap-2 flex-1 text-left"
                      onClick={() => setExpandedTemplate(isExpanded ? null : tmpl.id)}
                    >
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                      <span className="font-medium">{tmpl.title}</span>
                      {!tmpl.is_active && <Badge variant="inactive">Inactive</Badge>}
                    </button>
                    <span className="text-xs text-muted-foreground">{tmpl.questions_count ?? 0} questions</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditTemplate(tmpl); setTemplateModalOpen(true); }}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Delete this template?")) deleteTemplate.mutate(tmpl.id); }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <TemplateDetail template={tmpl} onEdit={() => { setEditTemplate(tmpl); setTemplateModalOpen(true); }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Assessments tab */}
      {tab === "assessments" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {assessmentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : assessments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No assessments found.</p>
            </div>
          ) : (
            <DataTable<Assessment> data={assessments} columns={assessmentColumns} emptyMessage="No assessments found." />
          )}
        </div>
      )}

      <TemplateFormModal
        open={templateModalOpen}
        onClose={() => { setTemplateModalOpen(false); setEditTemplate(undefined); }}
        editData={editTemplate}
      />
      <AssessmentFormModal
        open={assessmentModalOpen}
        onClose={() => setAssessmentModalOpen(false)}
        templates={templates}
      />
    </div>
  );
}
