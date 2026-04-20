import { useState } from "react";
import { Plus, Pencil, Inbox, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useRiskAppetites,
  useCreateRiskAppetite,
  useUpdateRiskAppetite,
  useDeleteRiskAppetite,
  useRiskCategories,
  type RiskAppetite,
  type AppetiteApprovalStatus,
} from "@/api/risks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const ratingOptions = ["low", "medium", "high", "critical"] as const;
const approvalOptions: AppetiteApprovalStatus[] = ["draft", "approved", "revoked"];

const approvalVariant: Record<AppetiteApprovalStatus, string> = {
  draft: "draft",
  approved: "approved",
  revoked: "inactive",
};

const ratingVariant: Record<string, string> = {
  low: "active",
  medium: "in_progress",
  high: "high",
  critical: "destructive",
};

const appetiteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  statement: z.string().optional().default(""),
  category: z.string().nullable().optional(),
  threshold_green: z.coerce.number().int().min(1).max(25),
  threshold_amber: z.coerce.number().int().min(1).max(25),
  threshold_red: z.coerce.number().int().min(1).max(25),
  max_acceptable_rating: z.enum(ratingOptions),
  approval_status: z.enum(["draft", "approved", "revoked"]),
  effective_date: z.string().nullable().optional(),
  review_date: z.string().nullable().optional(),
});

type AppetiteFormValues = z.infer<typeof appetiteSchema>;

function AppetiteFormModal({
  open,
  onClose,
  appetite,
}: {
  open: boolean;
  onClose: () => void;
  appetite?: RiskAppetite;
}) {
  const create = useCreateRiskAppetite();
  const update = useUpdateRiskAppetite(appetite?.id ?? "");
  const { data: categories } = useRiskCategories();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AppetiteFormValues>({
    resolver: zodResolver(appetiteSchema),
    defaultValues: appetite
      ? {
          name: appetite.name,
          statement: appetite.statement ?? "",
          category: appetite.category ?? null,
          threshold_green: appetite.threshold_green,
          threshold_amber: appetite.threshold_amber,
          threshold_red: appetite.threshold_red,
          max_acceptable_rating: appetite.max_acceptable_rating,
          approval_status: appetite.approval_status,
          effective_date: appetite.effective_date,
          review_date: appetite.review_date,
        }
      : {
          name: "",
          statement: "",
          category: null,
          threshold_green: 6,
          threshold_amber: 12,
          threshold_red: 20,
          max_acceptable_rating: "medium",
          approval_status: "draft",
          effective_date: null,
          review_date: null,
        },
  });

  const isEditing = !!appetite;
  const mutation = isEditing ? update : create;

  function onSubmit(values: AppetiteFormValues) {
    const payload: Partial<RiskAppetite> = {
      ...values,
      category: values.category || null,
      effective_date: values.effective_date || null,
      review_date: values.review_date || null,
    };
    mutation.mutate(payload, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Risk Appetite" : "New Risk Appetite"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name *" {...register("name")} error={errors.name?.message} />
        <Textarea
          label="Statement"
          rows={3}
          placeholder="e.g. Zero tolerance for material regulatory breaches; moderate tolerance for IT outages."
          {...register("statement")}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register("category")}
            >
              <option value="">All Categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Max Acceptable Rating *</label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register("max_acceptable_rating")}
            >
              {ratingOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="rounded-lg border p-4 space-y-3">
          <legend className="px-2 text-sm font-medium">Quantitative Thresholds (score 1-25)</legend>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Green ≤"
              type="number"
              min={1}
              max={25}
              {...register("threshold_green")}
              error={errors.threshold_green?.message}
            />
            <Input
              label="Amber ≤"
              type="number"
              min={1}
              max={25}
              {...register("threshold_amber")}
              error={errors.threshold_amber?.message}
            />
            <Input
              label="Red ≥"
              type="number"
              min={1}
              max={25}
              {...register("threshold_red")}
              error={errors.threshold_red?.message}
            />
          </div>
        </fieldset>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Approval Status *</label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register("approval_status")}
            >
              {approvalOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Input label="Effective Date" type="date" {...register("effective_date")} />
          <Input label="Review Date" type="date" {...register("review_date")} />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save appetite. Please try again.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Create Appetite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function RiskAppetitePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editAppetite, setEditAppetite] = useState<RiskAppetite | undefined>();
  const { data, isLoading, isError } = useRiskAppetites();
  const remove = useDeleteRiskAppetite();

  const appetites = (data?.results ?? []) as RiskAppetite[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Risk Appetite</h1>
          <p className="text-sm text-muted-foreground">
            Board-approved tolerance for risk per category and business unit (ISO 31000 / COSO ERM).
          </p>
        </div>
        <Button
          onClick={() => {
            setEditAppetite(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Appetite
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load risk appetites.
        </div>
      ) : appetites.length === 0 ? (
        <div className="rounded-lg border bg-card py-16 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 opacity-30" />
          No risk appetite statements defined yet.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Max Rating</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Thresholds (G/A/R)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Review</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appetites.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.name}</div>
                    {a.statement && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{a.statement}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.category_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ratingVariant[a.max_acceptable_rating] ?? "outline"}>
                      {a.max_acceptable_rating}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {a.threshold_green} / {a.threshold_amber} / {a.threshold_red}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={approvalVariant[a.approval_status] ?? "outline"}>
                      {a.approval_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.review_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditAppetite(a);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete "${a.name}"?`)) remove.mutate(a.id);
                        }}
                      >
                        <Inbox className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AppetiteFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditAppetite(undefined);
        }}
        appetite={editAppetite}
      />
    </div>
  );
}
