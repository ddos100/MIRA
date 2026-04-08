import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, CheckCircle2 } from "lucide-react";
import {
  useFrameworkTemplates,
  useInstantiateFramework,
  useFrameworks,
  type FrameworkTemplate,
} from "@/api/compliance";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

// ─── Instantiate Modal ────────────────────────────────────────────────────────

interface InstantiateModalProps {
  template: FrameworkTemplate | null;
  onClose: () => void;
}

function InstantiateModal({ template, onClose }: InstantiateModalProps) {
  const navigate = useNavigate();
  const [customName, setCustomName] = useState("");
  const [customVersion, setCustomVersion] = useState("");
  const instantiate = useInstantiateFramework();

  if (!template) return null;

  const handleInstantiate = async () => {
    await instantiate.mutateAsync({
      templateId: template.id,
      name: customName.trim() || undefined,
      version: customVersion.trim() || undefined,
    });
    onClose();
    navigate("/compliance/frameworks");
  };

  return (
    <Modal
      open={!!template}
      onClose={onClose}
      title={`Instantiate: ${template.name}`}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This will create a new Compliance Framework with all standard requirements
          pre-populated from the <strong>{template.name}</strong> template.
        </p>

        <Input
          label="Custom Framework Name (optional)"
          placeholder={template.name}
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />

        <Input
          label="Version Override (optional)"
          placeholder={template.version || "e.g. 2022"}
          value={customVersion}
          onChange={(e) => setCustomVersion(e.target.value)}
        />

        {instantiate.isError && (
          <p className="text-sm text-destructive">
            Failed to instantiate framework. It may already exist.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInstantiate}
            isLoading={instantiate.isPending}
          >
            <Download className="h-4 w-4" />
            Instantiate Framework
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FrameworkTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<FrameworkTemplate | null>(null);

  const { data: templatesData, isLoading, isError } = useFrameworkTemplates();
  const { data: frameworksData } = useFrameworks();

  const templates = templatesData?.results ?? [];
  const instantiatedNames = new Set(
    (frameworksData?.results ?? []).map((f) => f.name.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load framework templates.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Framework Templates"
        description="Pre-built compliance framework templates. Instantiate one to create a full framework with all requirements."
      />

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          No framework templates available. Contact your administrator to seed the database.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => {
            const alreadyInstantiated = instantiatedNames.has(
              tmpl.name.toLowerCase()
            );
            const reqCount = tmpl.structure?.length ?? 0;

            return (
              <div
                key={tmpl.id}
                className="rounded-lg border bg-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tmpl.issuing_body || "—"}{tmpl.version ? ` · v${tmpl.version}` : ""}
                    </p>
                  </div>
                  <Badge variant={tmpl.is_active ? "active" : "inactive"}>
                    {tmpl.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {tmpl.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tmpl.description}
                  </p>
                )}

                <div className="text-xs text-muted-foreground">
                  {reqCount > 0 ? `${reqCount} top-level requirements` : "No requirements defined"}
                </div>

                <div className="mt-auto pt-2">
                  {alreadyInstantiated ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Already instantiated
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!tmpl.is_active}
                      onClick={() => setSelectedTemplate(tmpl)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Instantiate
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InstantiateModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      />
    </div>
  );
}
