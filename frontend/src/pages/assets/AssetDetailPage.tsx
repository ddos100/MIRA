import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";

import {
  useAsset,
  useDataAssets,
} from "@/api/assets";
import { CriticalityBadge } from "@/components/assets/CriticalityBadge";
import { ClassificationBadge } from "@/components/assets/ClassificationBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Lazy import of asset form modal (inline for simplicity)
import AssetListPage from "./AssetListPage";

// ─── Info Card ────────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading, isError } = useAsset(id ?? "");

  // Fetch data asset record for this asset
  const { data: dataAssetData } = useDataAssets(
    id ? { asset: id } : undefined
  );
  const dataAsset = dataAssetData?.results?.[0];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/assets")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{asset.name}</h1>
            <CriticalityBadge
              value={asset.criticality as 1 | 2 | 3 | 4 | 5}
            />
            <Badge variant={asset.status}>{asset.status}</Badge>
          </div>
          {asset.category_name && (
            <p className="mt-1 text-sm text-muted-foreground">
              {asset.category_name}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/assets?edit=${asset.id}`)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      {/* Asset Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {asset.description && (
            <InfoRow label="Description" value={asset.description} />
          )}
          <InfoRow label="Owner" value={asset.owner_name} />
          <InfoRow label="Business Unit" value={asset.business_unit_name} />
          <InfoRow label="Category" value={asset.category_name} />
          <InfoRow
            label="Criticality"
            value={
              <CriticalityBadge
                value={asset.criticality as 1 | 2 | 3 | 4 | 5}
              />
            }
          />
          <InfoRow label="Status" value={<Badge variant={asset.status}>{asset.status}</Badge>} />
          {asset.asset_value && (
            <InfoRow
              label="Asset Value"
              value={`$${Number(asset.asset_value).toLocaleString()}`}
            />
          )}
          {asset.notes && <InfoRow label="Notes" value={asset.notes} />}
        </CardContent>
      </Card>

      {/* Data Classification Card */}
      {dataAsset && (
        <Card>
          <CardHeader>
            <CardTitle>Data Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Classification"
              value={
                <ClassificationBadge value={dataAsset.classification} />
              }
            />
            <InfoRow
              label="Retention Period"
              value={
                dataAsset.retention_period_days
                  ? `${dataAsset.retention_period_days} days`
                  : undefined
              }
            />
            {dataAsset.legal_basis && (
              <InfoRow label="Legal Basis" value={dataAsset.legal_basis} />
            )}
            {dataAsset.processing_purpose && (
              <InfoRow
                label="Processing Purpose"
                value={dataAsset.processing_purpose}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Related Risks */}
      <Card>
        <CardHeader>
          <CardTitle>Related Risks</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            to={`/risks?asset=${asset.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View risks linked to this asset
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      {/* Related Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Related Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            to={`/incidents?asset=${asset.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View incidents linked to this asset
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
