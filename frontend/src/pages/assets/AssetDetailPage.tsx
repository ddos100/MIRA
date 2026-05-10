import { useState, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";

import { useAsset, useDataAssets } from "@/api/assets";
import { CriticalityBadge } from "@/components/assets/CriticalityBadge";
import { ClassificationBadge } from "@/components/assets/ClassificationBadge";
import { AssetFormModal } from "@/components/assets/AssetFormModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

// ─── CIA colours ──────────────────────────────────────────────────────────────

const CIA_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function CIABadge({ value, label }: { value?: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {value ? (
        <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize w-fit", CIA_COLORS[value] ?? "bg-muted text-muted-foreground")}>
          {value}
        </span>
      ) : <span className="text-sm text-muted-foreground">—</span>}
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-44 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value || <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const { data: asset, isLoading, isError } = useAsset(id ?? "");
  const { data: dataAssetData } = useDataAssets(id ? { asset: id } : undefined);
  const dataAsset = dataAssetData?.results?.[0];

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  }

  if (isError || !asset) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load asset.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/assets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{asset.name}</h1>
            <CriticalityBadge value={asset.criticality as 1 | 2 | 3 | 4 | 5} />
            <Badge variant={asset.status}>{asset.status}</Badge>
          </div>
          {asset.category_name && (
            <p className="mt-1 text-sm text-muted-foreground">{asset.category_name}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit Asset
        </Button>
      </div>

      {/* Asset Information */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {asset.description && <InfoRow label="Description" value={asset.description} />}
          <InfoRow label="Owner" value={asset.owner_name} />
          <InfoRow label="Business Unit" value={asset.business_unit_name} />
          <InfoRow label="Category" value={asset.category_name} />
          <InfoRow label="Status" value={<Badge variant={asset.status}>{asset.status}</Badge>} />
          {asset.asset_value && (
            <InfoRow label="Asset Value" value={`$${Number(asset.asset_value).toLocaleString()}`} />
          )}
          {asset.tags?.length > 0 && (
            <InfoRow
              label="Tags"
              value={
                <div className="flex flex-wrap gap-1">
                  {asset.tags.map(t => (
                    <span key={t} className="rounded bg-muted px-2 py-0.5 text-xs">{t}</span>
                  ))}
                </div>
              }
            />
          )}
          {asset.notes && <InfoRow label="Notes" value={asset.notes} />}
          <InfoRow label="Created" value={new Date(asset.created_at).toLocaleDateString()} />
          <InfoRow label="Last Updated" value={new Date(asset.updated_at).toLocaleDateString()} />
        </CardContent>
      </Card>

      {/* CIA Triad */}
      <Card>
        <CardHeader>
          <CardTitle>CIA Impact Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Criticality</span>
              <CriticalityBadge value={asset.criticality as 1 | 2 | 3 | 4 | 5} />
            </div>
            <CIABadge label="Confidentiality" value={asset.confidentiality} />
            <CIABadge label="Integrity" value={asset.integrity} />
            <CIABadge label="Availability" value={asset.availability} />
          </div>
        </CardContent>
      </Card>

      {/* Data Classification */}
      {dataAsset && (
        <Card>
          <CardHeader>
            <CardTitle>Data Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Classification" value={<ClassificationBadge value={dataAsset.classification} />} />
            <InfoRow
              label="Retention Period"
              value={dataAsset.retention_period_days ? `${dataAsset.retention_period_days} days` : undefined}
            />
            {dataAsset.legal_basis && <InfoRow label="Legal Basis" value={dataAsset.legal_basis} />}
            {dataAsset.processing_purpose && <InfoRow label="Processing Purpose" value={dataAsset.processing_purpose} />}
          </CardContent>
        </Card>
      )}

      {/* Related Links */}
      <Card>
        <CardHeader>
          <CardTitle>Related Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link to={`/risks?asset=${asset.id}`}
            className="flex items-center gap-1 text-sm text-primary hover:underline">
            View risks linked to this asset <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link to={`/incidents?asset=${asset.id}`}
            className="flex items-center gap-1 text-sm text-primary hover:underline">
            View incidents linked to this asset <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <AssetFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        asset={asset}
        onSuccess={() => setEditOpen(false)}
      />
    </div>
  );
}
