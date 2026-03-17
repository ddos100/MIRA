import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  usePrograms,
  useFrameworks,
  useCreateProgram,
  useProgramGapSummary,
  type ComplianceProgram,
} from "@/api/compliance";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ─── Create Program Modal ─────────────────────────────────────────────────────

const createProgramSchema = z.object({
  name: z.string().min(1, "Name is required"),
  framework: z.string().min(1, "Framework is required"),
  description: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "suspended"]),
});

type CreateProgramForm = z.infer<typeof createProgramSchema>;

interface CreateProgramModalProps {
  open: boolean;
  onClose: () => void;
}

function CreateProgramModal({ open, onClose }: CreateProgramModalProps) {
  const { data: frameworksData } = useFrameworks();
  const createProgram = useCreateProgram();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProgramForm>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: { status: "planned" },
  });

  const onSubmit = (values: CreateProgramForm) => {
    createProgram.mutate(values, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  if (!open) return null;

  const frameworkOptions =
    frameworksData?.results?.map((fw) => ({
      value: fw.id,
      label: `${fw.short_name} – ${fw.name}`,
    })) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">New Compliance Program</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <Input
            label="Program Name"
            {...register("name")}
            error={errors.name?.message}
            placeholder="e.g. ISO 27001 2024"
          />

          <Select
            label="Framework"
            options={frameworkOptions}
            placeholder="Select a framework"
            {...register("framework")}
            error={errors.framework?.message}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              {...register("description")}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <Input
            label="Target Date"
            type="date"
            {...register("target_date")}
          />

          <Select
            label="Status"
            options={[
              { value: "planned", label: "Planned" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "suspended", label: "Suspended" },
            ]}
            {...register("status")}
            error={errors.status?.message}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createProgram.isPending}>
              Create Program
            </Button>
          </div>

          {createProgram.isError && (
            <p className="text-sm text-destructive">
              Failed to create program. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Gap Progress Bar ─────────────────────────────────────────────────────────

function ProgramProgressBar({ programId }: { programId: string }) {
  const { data: gapSummary } = useProgramGapSummary(programId);

  if (!gapSummary) {
    return (
      <div className="h-2 w-full rounded-full bg-muted">
        <div className="h-2 w-0 rounded-full bg-green-500" />
      </div>
    );
  }

  const total = gapSummary.total;
  const compliant = gapSummary.by_status.compliant;
  const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Compliance Progress</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-green-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({ program }: { program: ComplianceProgram }) {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{program.name}</CardTitle>
          <Badge variant={program.status}>{program.status.replace("_", " ")}</Badge>
        </div>
        {program.framework_name && (
          <Badge variant="outline" className="w-fit text-xs">
            {program.framework_name}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {program.owner_name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{program.owner_name}</span>
            </div>
          )}
          {program.target_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Target: {new Date(program.target_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="mt-auto">
          <ProgramProgressBar programId={program.id} />
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/compliance/${program.id}`)}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplianceProgramListPage() {
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading, isError } = usePrograms();
  const programs = data?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Programs</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage your compliance programs across frameworks.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          New Program
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load compliance programs.
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No compliance programs yet. Create your first program to get started.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-4 w-4" />
            New Program
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}

      <CreateProgramModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
