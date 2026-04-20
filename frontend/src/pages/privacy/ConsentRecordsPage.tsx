import { useState } from "react";
import { Plus, ShieldOff, Inbox, History } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useConsents,
  useCreateConsent,
  useWithdrawConsent,
  useDeleteConsent,
  useProcessingActivities,
  type ConsentRecord,
  type ConsentStatus,
  type ConsentChannel,
  type ConsentParams,
} from "@/api/privacy";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const channels: ConsentChannel[] = [
  "web_form", "email", "in_person", "paper", "api", "phone", "other",
];

const statusVariant: Record<ConsentStatus, string> = {
  granted: "approved",
  withdrawn: "rejected",
  expired: "inactive",
  pending: "pending",
};

const consentSchema = z.object({
  data_subject_identifier: z.string().min(1, "Identifier is required"),
  data_subject_name: z.string().optional().default(""),
  purpose: z.string().min(1, "Purpose is required"),
  processing_activity: z.string().nullable().optional(),
  legal_basis_text: z.string().optional().default(""),
  consent_version: z.string().optional().default(""),
  channel: z.enum(["web_form", "email", "in_person", "paper", "api", "phone", "other"]),
  status: z.enum(["granted", "withdrawn", "expired", "pending"]),
  evidence_ref: z.string().optional().default(""),
  expires_at: z.string().nullable().optional(),
});

type ConsentFormValues = z.infer<typeof consentSchema>;

function ConsentFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateConsent();
  const { data: paData } = useProcessingActivities({ page_size: 100 });
  const activities = paData?.results ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      data_subject_identifier: "",
      data_subject_name: "",
      purpose: "",
      processing_activity: null,
      legal_basis_text: "",
      consent_version: "",
      channel: "web_form",
      status: "granted",
      evidence_ref: "",
      expires_at: null,
    },
  });

  function onSubmit(values: ConsentFormValues) {
    const payload: Partial<ConsentRecord> = {
      ...values,
      processing_activity: values.processing_activity || null,
      expires_at: values.expires_at || null,
    };
    create.mutate(payload, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Record New Consent" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data Subject Identifier *"
            placeholder="email or customer ID"
            {...register("data_subject_identifier")}
            error={errors.data_subject_identifier?.message}
          />
          <Input
            label="Display Name"
            {...register("data_subject_name")}
          />
        </div>

        <Input
          label="Purpose *"
          placeholder="e.g. Marketing emails about new products"
          {...register("purpose")}
          error={errors.purpose?.message}
        />

        <div>
          <label className="text-sm font-medium">Linked Processing Activity</label>
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...register("processing_activity")}
          >
            <option value="">— None —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <Textarea
          label="Legal Basis Text (Art. 7(2) clarity)"
          rows={2}
          placeholder="The exact wording the data subject saw at consent time"
          {...register("legal_basis_text")}
        />

        <div className="grid grid-cols-3 gap-4">
          <Input label="Consent Notice Version" {...register("consent_version")} />
          <div>
            <label className="text-sm font-medium">Channel *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("channel")}>
              {channels.map((c) => (
                <option key={c} value={c}>{c.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Status *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("status")}>
              <option value="granted">Granted</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Expires At"
            type="datetime-local"
            {...register("expires_at")}
          />
          <Input
            label="Evidence Reference"
            placeholder="signed-form-2026-04-20.pdf"
            {...register("evidence_ref")}
          />
        </div>

        {create.isError && (
          <p className="text-sm text-destructive">Failed to record consent.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={create.isPending}>Record Consent</Button>
        </div>
      </form>
    </Modal>
  );
}

function WithdrawModal({
  open,
  onClose,
  consent,
}: {
  open: boolean;
  onClose: () => void;
  consent?: ConsentRecord;
}) {
  const withdraw = useWithdrawConsent(consent?.id ?? "");
  const [reason, setReason] = useState("");

  function submit() {
    withdraw.mutate(reason, {
      onSuccess: () => {
        setReason("");
        onClose();
      },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Withdraw Consent" size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Recording withdrawal for <strong>{consent?.purpose}</strong> by{" "}
          <strong>{consent?.data_subject_identifier}</strong>. This is appended to the audit log
          and cannot be reversed.
        </p>
        <Textarea
          label="Withdrawal reason / context"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={submit} isLoading={withdraw.isPending}>
            Confirm Withdrawal
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EventLogModal({
  open,
  onClose,
  consent,
}: {
  open: boolean;
  onClose: () => void;
  consent?: ConsentRecord;
}) {
  return (
    <Modal open={open} onClose={onClose} title={`Audit Log — ${consent?.purpose ?? ""}`} size="md">
      <div className="space-y-2">
        {(consent?.events ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded.</p>
        ) : (
          consent?.events.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 border-b py-2 last:border-0">
              <div>
                <Badge variant={e.event_type === "withdrawn" ? "rejected" : "outline"}>
                  {e.event_type}
                </Badge>
                <div className="mt-1 text-xs text-muted-foreground">
                  by {e.actor || "system"} · {e.ip_address ?? "—"}
                </div>
                {e.notes && <div className="mt-1 text-xs">{e.notes}</div>}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(e.occurred_at), "MMM d, yyyy HH:mm")}
              </span>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export default function ConsentRecordsPage() {
  const [params, setParams] = useState<ConsentParams>({ page: 1, page_size: 25 });
  const [createOpen, setCreateOpen] = useState(false);
  const [withdrawConsent, setWithdrawConsent] = useState<ConsentRecord | undefined>();
  const [logConsent, setLogConsent] = useState<ConsentRecord | undefined>();
  const remove = useDeleteConsent();

  const { data, isLoading, isError } = useConsents(params);
  const consents = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (params.page_size ?? 25));
  const currentPage = params.page ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consent Records</h1>
          <p className="text-sm text-muted-foreground">
            GDPR Article 7 / DPDPA Sec. 6 — granular consent capture, withdrawal, and audit trail.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Record Consent
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search subject, purpose..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-56"
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value || undefined, page: 1 }))}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          onChange={(e) => setParams((p) => ({ ...p, status: (e.target.value as ConsentStatus | ""), page: 1 }))}
        >
          <option value="">All Statuses</option>
          <option value="granted">Granted</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load consent records.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data Subject</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Purpose</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Granted</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {consents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <Inbox className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No consent records.
                  </td>
                </tr>
              ) : (
                consents.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.data_subject_name || c.data_subject_identifier}</div>
                      {c.data_subject_name && (
                        <div className="text-xs text-muted-foreground">{c.data_subject_identifier}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{c.purpose}</div>
                      {c.processing_activity_name && (
                        <div className="text-xs text-muted-foreground">→ {c.processing_activity_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{c.channel.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.granted_at ? format(new Date(c.granted_at), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="View audit log" onClick={() => setLogConsent(c)}>
                          <History className="h-4 w-4" />
                        </Button>
                        {c.status === "granted" && (
                          <Button size="icon" variant="ghost" title="Withdraw" onClick={() => setWithdrawConsent(c)}>
                            <ShieldOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          onClick={() => {
                            if (confirm("Delete this consent record?")) remove.mutate(c.id);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {consents.length} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}>Previous</Button>
            <span className="flex h-8 items-center px-3 text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      <ConsentFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <WithdrawModal
        open={!!withdrawConsent}
        onClose={() => setWithdrawConsent(undefined)}
        consent={withdrawConsent}
      />
      <EventLogModal
        open={!!logConsent}
        onClose={() => setLogConsent(undefined)}
        consent={logConsent}
      />
    </div>
  );
}
