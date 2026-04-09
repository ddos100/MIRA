/**
 * ThreatsPage — Threats & Vulnerabilities management.
 * Pre-populated with Cyber and Information Security threats by asset type.
 * Aligned to ISO 27001:2022 Annex A and MITRE ATT&CK framework.
 * Implements Maker/Checker workflow for review.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle, Bug, Edit2, Link2, Plus, Shield, ShieldAlert,
  ShieldCheck, Trash2, Unlink,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useThreats, useCreateThreat, useUpdateThreat, useDeleteThreat,
  useVulnerabilities, useCreateVulnerability, useUpdateVulnerability, useDeleteVulnerability,
  type Threat, type Vulnerability, type ThreatType, type VulnerabilityType,
} from "@/api/threats";

// ─── Constants ────────────────────────────────────────────────────────────────

const THREAT_TYPES: { value: ThreatType; label: string }[] = [
  { value: "cyber", label: "Cyber" },
  { value: "information_security", label: "Information Security" },
  { value: "physical", label: "Physical" },
  { value: "insider", label: "Insider" },
  { value: "environmental", label: "Environmental" },
  { value: "supply_chain", label: "Supply Chain" },
  { value: "compliance", label: "Compliance" },
  { value: "operational", label: "Operational" },
];

const VULN_TYPES: { value: VulnerabilityType; label: string }[] = [
  { value: "software", label: "Software" },
  { value: "hardware", label: "Hardware" },
  { value: "network", label: "Network" },
  { value: "process", label: "Process" },
  { value: "human", label: "Human" },
  { value: "physical", label: "Physical" },
  { value: "configuration", label: "Configuration" },
  { value: "data", label: "Data" },
];

const ASSET_TYPES = [
  "server", "workstation", "mobile_device", "network_device", "cloud_service",
  "application", "database", "data", "facility", "person", "third_party",
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  server: "Server", workstation: "Workstation", mobile_device: "Mobile Device",
  network_device: "Network Device", cloud_service: "Cloud Service",
  application: "Application", database: "Database", data: "Data",
  facility: "Facility", person: "Person", third_party: "Third Party",
};

const ISO_CLAUSES = [
  { value: "", label: "— None —" },
  { value: "A.5.1", label: "A.5.1 — Policies for information security" },
  { value: "A.5.7", label: "A.5.7 — Threat intelligence" },
  { value: "A.5.14", label: "A.5.14 — Information transfer" },
  { value: "A.5.23", label: "A.5.23 — Information security for cloud services" },
  { value: "A.6.1", label: "A.6.1 — Screening" },
  { value: "A.6.3", label: "A.6.3 — Information security awareness" },
  { value: "A.7.1", label: "A.7.1 — Physical security perimeters" },
  { value: "A.8.1", label: "A.8.1 — User endpoint devices" },
  { value: "A.8.7", label: "A.8.7 — Protection against malware" },
  { value: "A.8.8", label: "A.8.8 — Management of technical vulnerabilities" },
  { value: "A.8.20", label: "A.8.20 — Networks security" },
  { value: "A.8.25", label: "A.8.25 — Secure development lifecycle" },
];

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityVariant(v: number): "critical" | "high" | "medium" | "low" {
  if (v >= 5) return "critical";
  if (v >= 4) return "high";
  if (v >= 3) return "medium";
  return "low";
}

function riskScoreVariant(s: number): "critical" | "high" | "medium" | "low" {
  if (s >= 20) return "critical";
  if (s >= 12) return "high";
  if (s >= 6) return "medium";
  return "low";
}

function SeverityBadge({ value, label }: { value: number; label?: string }) {
  const variant = severityVariant(value);
  const LABELS = ["", "Very Low", "Low", "Medium", "High", "Critical"];
  return <Badge variant={variant}>{label ?? LABELS[value] ?? value}</Badge>;
}

// ─── Threat Form ──────────────────────────────────────────────────────────────

const threatSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  threat_type: z.string().min(1, "Type is required"),
  asset_types: z.array(z.string()).optional(),
  likelihood: z.coerce.number().min(1).max(5),
  severity: z.coerce.number().min(1).max(5),
  source: z.enum(["external", "internal", "both"]),
  iso27001_clause: z.string().optional(),
  mitre_attack_id: z.string().optional(),
});
type ThreatFormValues = z.infer<typeof threatSchema>;

interface ThreatFormModalProps {
  open: boolean;
  threat?: Threat | null;
  onClose: () => void;
}

function ThreatFormModal({ open, threat, onClose }: ThreatFormModalProps) {
  const createMutation = useCreateThreat();
  const updateMutation = useUpdateThreat(threat?.id ?? "");
  const isEditing = !!threat;

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } =
    useForm<ThreatFormValues>({
      resolver: zodResolver(threatSchema),
      defaultValues: {
        name: threat?.name ?? "",
        description: threat?.description ?? "",
        threat_type: threat?.threat_type ?? "cyber",
        asset_types: threat?.asset_types ?? [],
        likelihood: threat?.likelihood ?? 3,
        severity: threat?.severity ?? 3,
        source: threat?.source ?? "external",
        iso27001_clause: threat?.iso27001_clause ?? "",
        mitre_attack_id: threat?.mitre_attack_id ?? "",
      },
    });

  const selectedAssets = watch("asset_types") ?? [];

  function toggleAsset(at: string) {
    if (selectedAssets.includes(at)) {
      setValue("asset_types", selectedAssets.filter((a) => a !== at));
    } else {
      setValue("asset_types", [...selectedAssets, at]);
    }
  }

  async function onSubmit(values: ThreatFormValues) {
    if (isEditing) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
    reset();
    onClose();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Threat" : "Add Threat"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input {...register("name")} placeholder="e.g. Ransomware Attack" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea {...register("description")} rows={2} placeholder="Describe this threat…" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Threat Type *</label>
            <select
              {...register("threat_type")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {THREAT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <select
              {...register("source")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="external">External</option>
              <option value="internal">Internal</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Likelihood (1–5)</label>
            <Input type="number" {...register("likelihood")} min={1} max={5} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Severity (1–5)</label>
            <Input type="number" {...register("severity")} min={1} max={5} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ISO 27001 Clause</label>
            <select
              {...register("iso27001_clause")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ISO_CLAUSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">MITRE ATT&CK ID</label>
            <Input {...register("mitre_attack_id")} placeholder="e.g. T1486" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Applicable Asset Types</label>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPES.map((at) => (
              <button
                key={at}
                type="button"
                onClick={() => toggleAsset(at)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium border transition-colors",
                  selectedAssets.includes(at)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-muted"
                )}
              >
                {ASSET_TYPE_LABELS[at]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isPending}>
            {isEditing ? "Save Changes" : "Add Threat"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Vulnerability Form ───────────────────────────────────────────────────────

const vulnSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  vulnerability_type: z.string().min(1, "Type is required"),
  asset_types: z.array(z.string()).optional(),
  severity: z.coerce.number().min(1).max(5),
  cvss_score: z.coerce.number().min(0).max(10).optional().nullable(),
  cve_id: z.string().optional(),
  remediation: z.string().optional(),
  iso27001_clause: z.string().optional(),
});
type VulnFormValues = z.infer<typeof vulnSchema>;

interface VulnFormModalProps {
  open: boolean;
  vulnerability?: Vulnerability | null;
  onClose: () => void;
}

function VulnFormModal({ open, vulnerability, onClose }: VulnFormModalProps) {
  const createMutation = useCreateVulnerability();
  const updateMutation = useUpdateVulnerability(vulnerability?.id ?? "");
  const isEditing = !!vulnerability;

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } =
    useForm<VulnFormValues>({
      resolver: zodResolver(vulnSchema),
      defaultValues: {
        name: vulnerability?.name ?? "",
        description: vulnerability?.description ?? "",
        vulnerability_type: vulnerability?.vulnerability_type ?? "software",
        asset_types: vulnerability?.asset_types ?? [],
        severity: vulnerability?.severity ?? 3,
        cvss_score: vulnerability?.cvss_score ?? null,
        cve_id: vulnerability?.cve_id ?? "",
        remediation: vulnerability?.remediation ?? "",
        iso27001_clause: vulnerability?.iso27001_clause ?? "",
      },
    });

  const selectedAssets = watch("asset_types") ?? [];

  function toggleAsset(at: string) {
    if (selectedAssets.includes(at)) {
      setValue("asset_types", selectedAssets.filter((a) => a !== at));
    } else {
      setValue("asset_types", [...selectedAssets, at]);
    }
  }

  async function onSubmit(values: VulnFormValues) {
    if (isEditing) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
    reset();
    onClose();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Vulnerability" : "Add Vulnerability"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input {...register("name")} placeholder="e.g. Unpatched Software" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea {...register("description")} rows={2} placeholder="Describe this vulnerability…" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vulnerability Type *</label>
            <select
              {...register("vulnerability_type")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {VULN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Severity (1–5)</label>
            <Input type="number" {...register("severity")} min={1} max={5} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CVSS Score (0–10)</label>
            <Input type="number" {...register("cvss_score")} min={0} max={10} step={0.1} placeholder="e.g. 7.5" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CVE ID</label>
            <Input {...register("cve_id")} placeholder="e.g. CVE-2024-1234" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ISO 27001 Clause</label>
            <select
              {...register("iso27001_clause")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ISO_CLAUSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Remediation</label>
            <Textarea {...register("remediation")} rows={2} placeholder="Recommended remediation steps…" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Applicable Asset Types</label>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPES.map((at) => (
              <button
                key={at}
                type="button"
                onClick={() => toggleAsset(at)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium border transition-colors",
                  selectedAssets.includes(at)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-muted"
                )}
              >
                {ASSET_TYPE_LABELS[at]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isPending}>
            {isEditing ? "Save Changes" : "Add Vulnerability"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Threat Card ──────────────────────────────────────────────────────────────

interface ThreatCardProps {
  threat: Threat;
  onEdit: (t: Threat) => void;
  onDelete: (t: Threat) => void;
}

function ThreatCard({ threat, onEdit, onDelete }: ThreatCardProps) {
  const THREAT_LABELS: Record<ThreatType, string> = {
    cyber: "Cyber", information_security: "Info Security", physical: "Physical",
    insider: "Insider", environmental: "Environmental", supply_chain: "Supply Chain",
    compliance: "Compliance", operational: "Operational",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate">{threat.name}</p>
            {threat.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{threat.description}</p>
            )}
          </div>
        </div>
        {!threat.is_system_default && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => onEdit(threat)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(threat)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {THREAT_LABELS[threat.threat_type]}
        </span>
        <Badge variant={riskScoreVariant(threat.risk_score)}>
          Risk: {threat.risk_score}
        </Badge>
        <SeverityBadge value={threat.likelihood} label={`L:${threat.likelihood}`} />
        <SeverityBadge value={threat.severity} label={`S:${threat.severity}`} />
      </div>

      {threat.asset_types.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {threat.asset_types.map((at) => (
            <span key={at} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
              {ASSET_TYPE_LABELS[at] ?? at}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {threat.iso27001_clause && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              ISO {threat.iso27001_clause}
            </span>
          )}
          {threat.mitre_attack_id && (
            <span className="font-mono bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">
              {threat.mitre_attack_id}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          {threat.linked_vulnerability_count} vulns
        </span>
      </div>

      {threat.is_system_default && (
        <div className="text-xs text-muted-foreground italic">System Default</div>
      )}
    </div>
  );
}

// ─── Vulnerability Card ───────────────────────────────────────────────────────

interface VulnCardProps {
  vulnerability: Vulnerability;
  onEdit: (v: Vulnerability) => void;
  onDelete: (v: Vulnerability) => void;
}

function VulnCard({ vulnerability: v, onEdit, onDelete }: VulnCardProps) {
  const VULN_LABELS: Record<VulnerabilityType, string> = {
    software: "Software", hardware: "Hardware", network: "Network",
    process: "Process", human: "Human", physical: "Physical",
    configuration: "Configuration", data: "Data",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Bug className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate">{v.name}</p>
            {v.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{v.description}</p>
            )}
          </div>
        </div>
        {!v.is_system_default && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => onEdit(v)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(v)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          {VULN_LABELS[v.vulnerability_type]}
        </span>
        <SeverityBadge value={v.severity} />
        {v.cvss_score !== null && (
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
            v.cvss_score >= 9 ? "bg-red-100 text-red-700 border-red-200" :
            v.cvss_score >= 7 ? "bg-orange-100 text-orange-700 border-orange-200" :
            v.cvss_score >= 4 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
            "bg-green-100 text-green-700 border-green-200"
          )}>
            CVSS {v.cvss_score.toFixed(1)}
          </span>
        )}
      </div>

      {v.asset_types.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {v.asset_types.map((at) => (
            <span key={at} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
              {ASSET_TYPE_LABELS[at] ?? at}
            </span>
          ))}
        </div>
      )}

      {v.remediation && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2 line-clamp-2">
          <span className="font-medium text-foreground">Remediation:</span> {v.remediation}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {v.iso27001_clause && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              ISO {v.iso27001_clause}
            </span>
          )}
          {v.cve_id && (
            <span className="font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border">
              {v.cve_id}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          {v.linked_threat_count} threats
        </span>
      </div>

      {v.is_system_default && (
        <div className="text-xs text-muted-foreground italic">System Default</div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type MainTab = "threats" | "vulnerabilities";

export default function ThreatsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("threats");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");

  // Threat state
  const [threatModalOpen, setThreatModalOpen] = useState(false);
  const [editingThreat, setEditingThreat] = useState<Threat | null>(null);
  const [deletingThreat, setDeletingThreat] = useState<Threat | null>(null);
  const deleteThreatMutation = useDeleteThreat();

  // Vulnerability state
  const [vulnModalOpen, setVulnModalOpen] = useState(false);
  const [editingVuln, setEditingVuln] = useState<Vulnerability | null>(null);
  const [deletingVuln, setDeletingVuln] = useState<Vulnerability | null>(null);
  const deleteVulnMutation = useDeleteVulnerability();

  // Data
  const threatParams: Record<string, unknown> = {};
  if (typeFilter) threatParams.threat_type = typeFilter;
  if (assetFilter) threatParams.asset_type = assetFilter;
  if (search) threatParams.search = search;

  const vulnParams: Record<string, unknown> = {};
  if (typeFilter) vulnParams.vulnerability_type = typeFilter;
  if (assetFilter) vulnParams.asset_type = assetFilter;
  if (search) vulnParams.search = search;

  const { data: threats = [], isLoading: threatsLoading } = useThreats(
    activeTab === "threats" ? threatParams : undefined
  );
  const { data: vulnerabilities = [], isLoading: vulnsLoading } = useVulnerabilities(
    activeTab === "vulnerabilities" ? vulnParams : undefined
  );

  const cyberThreats = threats.filter((t) => t.threat_type === "cyber" || t.threat_type === "information_security");
  const otherThreats = threats.filter((t) => t.threat_type !== "cyber" && t.threat_type !== "information_security");

  const tabs: { id: MainTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "threats", label: "Threats", icon: <ShieldAlert className="h-4 w-4" />, count: threats.length },
    { id: "vulnerabilities", label: "Vulnerabilities", icon: <Bug className="h-4 w-4" />, count: vulnerabilities.length },
  ];

  function handleEditThreat(t: Threat) {
    setEditingThreat(t);
    setThreatModalOpen(true);
  }

  function handleEditVuln(v: Vulnerability) {
    setEditingVuln(v);
    setVulnModalOpen(true);
  }

  function handleThreatModalClose() {
    setThreatModalOpen(false);
    setEditingThreat(null);
  }

  function handleVulnModalClose() {
    setVulnModalOpen(false);
    setEditingVuln(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Threats & Vulnerabilities"
        description="Pre-populated threat intelligence aligned to ISO 27001:2022 Annex A and MITRE ATT&CK framework."
        action={
          <Button
            onClick={() => activeTab === "threats" ? setThreatModalOpen(true) : setVulnModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {activeTab === "threats" ? "Add Threat" : "Add Vulnerability"}
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground">Total Threats</span>
          </div>
          <p className="text-2xl font-bold">{threats.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bug className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">Vulnerabilities</span>
          </div>
          <p className="text-2xl font-bold">{vulnerabilities.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-muted-foreground">Cyber / InfoSec</span>
          </div>
          <p className="text-2xl font-bold">{cyberThreats.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Other Threats</span>
          </div>
          <p className="text-2xl font-bold">{otherThreats.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setTypeFilter(""); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-normal",
                activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={activeTab === "threats" ? "Search threats…" : "Search vulnerabilities…"}
          className="w-64"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {(activeTab === "threats" ? THREAT_TYPES : VULN_TYPES).map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Asset Types</option>
          {ASSET_TYPES.map((at) => (
            <option key={at} value={at}>{ASSET_TYPE_LABELS[at]}</option>
          ))}
        </select>
        {(search || typeFilter || assetFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setTypeFilter(""); setAssetFilter(""); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {activeTab === "threats" && (
        <div>
          {threatsLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading threats…</div>
          ) : threats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No threats found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {threats.map((threat) => (
                <ThreatCard
                  key={threat.id}
                  threat={threat}
                  onEdit={handleEditThreat}
                  onDelete={setDeletingThreat}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "vulnerabilities" && (
        <div>
          {vulnsLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading vulnerabilities…</div>
          ) : vulnerabilities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No vulnerabilities found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vulnerabilities.map((vuln) => (
                <VulnCard
                  key={vuln.id}
                  vulnerability={vuln}
                  onEdit={handleEditVuln}
                  onDelete={setDeletingVuln}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ThreatFormModal
        open={threatModalOpen}
        threat={editingThreat}
        onClose={handleThreatModalClose}
      />
      <VulnFormModal
        open={vulnModalOpen}
        vulnerability={editingVuln}
        onClose={handleVulnModalClose}
      />

      <ConfirmDialog
        open={!!deletingThreat}
        title="Delete Threat"
        description={`Are you sure you want to delete "${deletingThreat?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deletingThreat) {
            await deleteThreatMutation.mutateAsync(deletingThreat.id);
            setDeletingThreat(null);
          }
        }}
        onCancel={() => setDeletingThreat(null)}
      />

      <ConfirmDialog
        open={!!deletingVuln}
        title="Delete Vulnerability"
        description={`Are you sure you want to delete "${deletingVuln?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deletingVuln) {
            await deleteVulnMutation.mutateAsync(deletingVuln.id);
            setDeletingVuln(null);
          }
        }}
        onCancel={() => setDeletingVuln(null)}
      />
    </div>
  );
}
