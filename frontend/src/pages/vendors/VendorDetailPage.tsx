import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Globe, Mail, Phone, User, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useVendor,
  useVendorReviews,
  useCreateVendorReview,
  useUpdateVendorReview,
  type VendorReview,
  type RiskTier,
  type ReviewStatus,
} from "@/api/vendors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskTierVariant(tier: RiskTier | null): string {
  if (!tier) return "default";
  return { tier1: "critical", tier2: "high", tier3: "medium", tier4: "low" }[tier] ?? "default";
}

function riskTierLabel(tier: RiskTier | null): string {
  if (!tier) return "—";
  return { tier1: "Tier 1 – Critical", tier2: "Tier 2 – High", tier3: "Tier 3 – Medium", tier4: "Tier 4 – Low" }[tier] ?? tier;
}

function reviewStatusVariant(s: ReviewStatus): string {
  return { pending: "pending", in_progress: "in_progress", completed: "completed", overdue: "overdue" }[s] ?? "default";
}

// ─── Review Form Modal ─────────────────────────────────────────────────────────

const reviewSchema = z.object({
  review_date: z.string().min(1, "Date is required"),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]),
  risk_rating: z.enum(["tier1", "tier2", "tier3", "tier4"]).nullable(),
  findings: z.string(),
  recommendations: z.string(),
  next_review_date: z.string().nullable(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormModalProps {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  review?: VendorReview;
}

function ReviewFormModal({ open, onClose, vendorId, review }: ReviewFormModalProps) {
  const createReview = useCreateVendorReview();
  const updateReview = useUpdateVendorReview(review?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: review
      ? {
          review_date: review.review_date,
          status: review.status,
          risk_rating: review.risk_rating ?? null,
          findings: review.findings ?? "",
          recommendations: review.recommendations ?? "",
          next_review_date: review.next_review_date ?? null,
        }
      : {
          review_date: format(new Date(), "yyyy-MM-dd"),
          status: "pending",
          risk_rating: null,
          findings: "",
          recommendations: "",
          next_review_date: null,
        },
  });

  const isEditing = !!review;
  const mutation = isEditing ? updateReview : createReview;

  function onSubmit(values: ReviewFormValues) {
    const payload = { ...values, third_party: vendorId };
    mutation.mutate(payload as Partial<VendorReview>, {
      onSuccess: () => { reset(); onClose(); },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Review" : "Add Review"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Review Date *" type="date" {...register("review_date")} error={errors.review_date?.message} />
          <div>
            <label className="text-sm font-medium text-foreground">Status *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("status")}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Risk Rating</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("risk_rating")}>
              <option value="">— Not Rated —</option>
              <option value="tier1">Tier 1 – Critical</option>
              <option value="tier2">Tier 2 – High</option>
              <option value="tier3">Tier 3 – Medium</option>
              <option value="tier4">Tier 4 – Low</option>
            </select>
          </div>
          <Input label="Next Review Date" type="date" {...register("next_review_date")} />
        </div>
        <Textarea label="Findings" rows={3} {...register("findings")} />
        <Textarea label="Recommendations" rows={3} {...register("recommendations")} />

        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to save review. Please try again.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Add Review"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editReview, setEditReview] = useState<VendorReview | undefined>();
  const [editVendorOpen, setEditVendorOpen] = useState(false);

  const { data: vendor, isLoading, isError } = useVendor(id ?? "");
  const { data: reviewsData, isLoading: reviewsLoading } = useVendorReviews(id ?? "");
  const reviews = reviewsData?.results ?? [];

  // Lazy import of VendorFormModal to avoid circular dependencies
  const [VendorFormModal, setVendorFormModal] = useState<React.ComponentType<{ open: boolean; onClose: () => void; vendor?: import("@/api/vendors").Vendor }> | null>(null);

  function handleEditVendor() {
    if (!VendorFormModal) {
      import("./VendorListPage").then((mod) => {
        // We re-use the inline component from this file instead
      });
    }
    setEditVendorOpen(true);
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  }

  if (isError || !vendor) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load vendor details.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vendors")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{vendor.name}</h1>
              <Badge variant={riskTierVariant(vendor.risk_tier)}>{riskTierLabel(vendor.risk_tier)}</Badge>
              <Badge variant={vendor.is_active ? "active" : "inactive"}>{vendor.is_active ? "Active" : "Inactive"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{vendor.vendor_type.replace("_", " ")}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditVendorOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit Vendor
        </Button>
      </div>

      {/* Two-Column Info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Contact Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.contact_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{vendor.contact_name}</span>
              </div>
            )}
            {vendor.contact_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a href={`mailto:${vendor.contact_email}`} className="text-primary hover:underline">
                  {vendor.contact_email}
                </a>
              </div>
            )}
            {vendor.contact_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{vendor.contact_phone}</span>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                  {vendor.website}
                </a>
              </div>
            )}
            {!vendor.contact_name && !vendor.contact_email && !vendor.contact_phone && !vendor.website && (
              <p className="text-sm text-muted-foreground">No contact information provided.</p>
            )}
          </CardContent>
        </Card>

        {/* Contract Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Contract Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contract Start</span>
              <span>{vendor.contract_start ? format(new Date(vendor.contract_start), "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contract End</span>
              <span>{vendor.contract_end ? format(new Date(vendor.contract_end), "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data Shared</span>
              <Badge variant={vendor.data_shared ? "active" : "inactive"}>{vendor.data_shared ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Processing Personal Data</span>
              <Badge variant={vendor.processing_personal_data ? "high" : "inactive"}>
                {vendor.processing_personal_data ? "Yes" : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {(vendor.description || vendor.services_provided) && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {vendor.description && (
              <div>
                <h3 className="text-sm font-medium mb-1">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vendor.description}</p>
              </div>
            )}
            {vendor.services_provided && (
              <div>
                <h3 className="text-sm font-medium mb-1">Services Provided</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vendor.services_provided}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Vendor Reviews
          </h2>
          <Button size="sm" onClick={() => { setEditReview(undefined); setReviewModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Review
          </Button>
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : reviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Shield className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm text-muted-foreground">No reviews yet. Add the first review.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reviewer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Risk Rating</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Findings</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.review_date ? format(new Date(r.review_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.reviewer_detail?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={reviewStatusVariant(r.status)}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.risk_rating ? (
                        <Badge variant={riskTierVariant(r.risk_rating)}>{riskTierLabel(r.risk_rating)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                      {r.findings || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setEditReview(r); setReviewModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReviewFormModal
        open={reviewModalOpen}
        onClose={() => { setReviewModalOpen(false); setEditReview(undefined); }}
        vendorId={id ?? ""}
        review={editReview}
      />
    </div>
  );
}
