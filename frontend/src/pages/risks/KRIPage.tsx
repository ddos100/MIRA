import { useState } from "react";
import { Plus, Pencil, Activity, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useKRIs,
  useCreateKRI,
  useUpdateKRI,
  useDeleteKRI,
  useRecordKRI,
  type KeyRiskIndicator,
  type KRIDirection,
  type KRIFrequency,
  type KRIStatus,
} from "@/api/risks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

const directions: KRIDirection[] = ["higher_worse", "lower_worse"];
const frequencies: KRIFrequency[] = ["daily", "weekly", "monthly", "quarterly", "annually"];

const statusVariant: Record<KRIStatus, string> = {
  green: "active",
  amber: "in_progress",
  red: "destructive",
  unknown: "inactive",
};

const statusDot: Record<KRIStatus, string> = {
  green: "bg-green-500",
  amber: "bg-yellow-500",
  red: "bg-red-500",
  unknown: "bg-gray-400",
};

const kriSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  metric_unit: z.string().optional().default(""),
  direction: z.enum(["higher_worse", "lower_worse"]),
  threshold_green: z.coerce.number(),
  threshold_amber: z.coerce.number(),
  threshold_red: z.coerce.number(),
  measurement_frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually"]),
  is_active: z.boolean(),
});

type KRIFormValues = z.infer<typeof kriSchema>;

function KRIFormModal({
  open,
  onClose,
  kri,
}: {
  open: boolean;
  onClose: () => void;
  kri?: KeyRiskIndicator;
}) {
  const create = useCreateKRI();
  const update = useUpdateKRI(kri?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<KRIFormValues>({
    resolver: zodResolver(kriSchema),
    defaultValues: kri
      ? {
          name: kri.name,
          description: kri.description,
          metric_unit: kri.metric_unit,
          direction: kri.direction,
          threshold_green: kri.threshold_green,
          threshold_amber: kri.threshold_amber,
          threshold_red: kri.threshold_red,
          measurement_frequency: kri.measurement_frequency,
          is_active: kri.is_active,
        }
      : {
          name: "",
          description: "",
          metric_unit: "",
          direction: "higher_worse",
          threshold_green: 0,
          threshold_amber: 0,
          threshold_red: 0,
          measurement_frequency: "monthly",
          is_active: true,
        },
  });

  const isEditing = !!kri;
  const mutation = isEditing ? update : create;

  function onSubmit(values: KRIFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit KRI" : "New Key Risk Indicator"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name *" {...register("name")} error={errors.name?.message} />
        <Textarea label="Description" rows={2} {...register("description")} />

        <div className="grid grid-cols-3 gap-4">
          <Input label="Metric Unit" placeholder="e.g. count, %" {...register("metric_unit")} />
          <div>
            <label className="text-sm font-medium">Direction *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("direction")}>
              {directions.map((d) => (
                <option key={d} value={d}>{d.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Frequency *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("measurement_frequency")}>
              {frequencies.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="rounded-lg border p-4 space-y-3">
          <legend className="px-2 text-sm font-medium">Thresholds</legend>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Green" type="number" step="any" {...register("threshold_green")} />
            <Input label="Amber" type="number" step="any" {...register("threshold_amber")} />
            <Input label="Red" type="number" step="any" {...register("threshold_red")} />
          </div>
        </fieldset>

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} />
          Active
        </label>

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save KRI.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Create KRI"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RecordModal({
  open,
  onClose,
  kri,
}: {
  open: boolean;
  onClose: () => void;
  kri?: KeyRiskIndicator;
}) {
  const record = useRecordKRI(kri?.id ?? "");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    if (!value) return;
    record.mutate(
      { value: parseFloat(value), note },
      {
        onSuccess: () => {
          setValue("");
          setNote("");
          onClose();
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={`Record measurement: ${kri?.name ?? ""}`} size="md">
      <div className="space-y-4">
        <Input
          label={`Value ${kri?.metric_unit ? `(${kri.metric_unit})` : ""} *`}
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Textarea
          label="Note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} isLoading={record.isPending} disabled={!value}>
            Record
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function KRIPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editKri, setEditKri] = useState<KeyRiskIndicator | undefined>();
  const [recordKri, setRecordKri] = useState<KeyRiskIndicator | undefined>();
  const { data, isLoading, isError } = useKRIs();
  const remove = useDeleteKRI();
  const kris = (data?.results ?? []) as KeyRiskIndicator[];

  const counts = {
    green: kris.filter((k) => k.status === "green").length,
    amber: kris.filter((k) => k.status === "amber").length,
    red: kris.filter((k) => k.status === "red").length,
    unknown: kris.filter((k) => k.status === "unknown").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Key Risk Indicators</h1>
          <p className="text-sm text-muted-foreground">
            Operational risk indicators with red/amber/green thresholds and measurement history.
          </p>
        </div>
        <Button onClick={() => { setEditKri(undefined); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          New KRI
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Green", value: counts.green, color: "text-green-600" },
          { label: "Amber", value: counts.amber, color: "text-yellow-600" },
          { label: "Red", value: counts.red, color: "text-red-600" },
          { label: "Unknown", value: counts.unknown, color: "text-muted-foreground" },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load KRIs.
        </div>
      ) : kris.length === 0 ? (
        <div className="rounded-lg border bg-card py-16 text-center text-muted-foreground">
          <Activity className="mx-auto mb-2 h-8 w-8 opacity-30" />
          No KRIs defined yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kris.map((k) => (
            <div key={k.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("inline-block h-2.5 w-2.5 rounded-full", statusDot[k.status])} />
                  <h3 className="font-semibold text-sm">{k.name}</h3>
                </div>
                <Badge variant={statusVariant[k.status]}>{k.status}</Badge>
              </div>
              {k.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{k.description}</p>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {k.current_value ?? "—"}
                </span>
                {k.metric_unit && <span className="text-xs text-muted-foreground">{k.metric_unit}</span>}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                G:{k.threshold_green} · A:{k.threshold_amber} · R:{k.threshold_red} · {k.direction === "higher_worse" ? "↑ worse" : "↓ worse"}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {k.last_measured_at
                    ? `Last: ${format(new Date(k.last_measured_at), "MMM d")}`
                    : "Never measured"}
                </span>
                <span>{k.measurement_frequency}</span>
              </div>
              <div className="flex justify-end gap-1 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => setRecordKri(k)}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  Record
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditKri(k); setModalOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete "${k.name}"?`)) remove.mutate(k.id);
                  }}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <KRIFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditKri(undefined); }}
        kri={editKri}
      />
      <RecordModal
        open={!!recordKri}
        onClose={() => setRecordKri(undefined)}
        kri={recordKri}
      />
    </div>
  );
}
