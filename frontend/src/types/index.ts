// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Auth / User ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: string;
  department?: string;
  avatar?: string;
}

// ─── Risk Types ───────────────────────────────────────────────────────────────

export type RiskStatus =
  | "open"
  | "in_treatment"
  | "accepted"
  | "closed"
  | "transferred";
export type RiskTreatmentType = "mitigate" | "avoid" | "transfer" | "accept";
export type RiskRating = "critical" | "high" | "medium" | "low";

export interface RiskCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  category_name?: string;
  category_detail?: RiskCategory;
  owner?: string | null;
  owner_name?: string;
  owner_detail?: { id: string; full_name: string; email: string };
  business_unit?: string;
  status: RiskStatus;
  treatment_type?: RiskTreatmentType | null;
  inherent_likelihood: number;
  inherent_impact: number;
  inherent_score: number;
  inherent_rating: RiskRating;
  residual_likelihood: number;
  residual_impact: number;
  residual_score: number;
  residual_rating: RiskRating;
  identified_date?: string | null;
  review_date?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskTreatmentPlan {
  id: string;
  risk: string;
  risk_detail?: Pick<Risk, "id" | "title">;
  title: string;
  description: string;
  owner?: string | null;
  owner_detail?: { id: string; full_name: string; email: string };
  due_date?: string | null;
  status: "pending" | "in_progress" | "completed" | "overdue";
  created_at: string;
  updated_at?: string;
}

// ─── Compliance Types ─────────────────────────────────────────────────────────

export interface ComplianceFramework {
  id: string;
  name: string;
  short_name: string;
  version: string;
  description: string;
  issuing_body: string;
  is_active: boolean;
}

export interface ComplianceProgram {
  id: string;
  name: string;
  framework: string;
  framework_name?: string;
  owner?: string;
  status: string;
  target_date?: string;
  description: string;
  created_at: string;
}

export interface ComplianceAssessment {
  id: string;
  program: string;
  requirement: string;
  requirement_ref?: string;
  requirement_title?: string;
  status: string;
  notes: string;
  assessor?: string;
  assessment_date?: string;
}

// ─── Asset Types ──────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  name: string;
  description: string;
  category?: string;
  category_name?: string;
  owner?: string;
  owner_name?: string;
  business_unit?: string;
  criticality: number;
  status: string;
  notes: string;
  created_at: string;
}

// ─── Third Party / Vendor Types ───────────────────────────────────────────────

export interface ThirdParty {
  id: string;
  name: string;
  vendor_type: string;
  risk_tier: string;
  website?: string;
  contact_name?: string;
  contact_email?: string;
  owner?: string;
  contract_start?: string;
  contract_end?: string;
  is_active: boolean;
  data_shared: boolean;
  processing_personal_data: boolean;
}

// ─── Incident Types ───────────────────────────────────────────────────────────

export interface Incident {
  id: string;
  title: string;
  description: string;
  category?: string;
  severity: string;
  status: string;
  owner?: string;
  detected_at?: string;
  reported_at?: string;
  is_data_breach: boolean;
  gdpr_notification_required: boolean;
  created_at: string;
}

// ─── Privacy / DPIA Types ─────────────────────────────────────────────────────

export interface ProcessingActivity {
  id: string;
  name: string;
  description: string;
  purpose: string;
  legal_basis: string;
  data_subjects: string;
  personal_data_categories: string;
  special_category_data: boolean;
  retention_period: string;
  cross_border_transfer: boolean;
  owner?: string;
  is_active: boolean;
}

// ─── Policy Types ─────────────────────────────────────────────────────────────

export interface Policy {
  id: string;
  title: string;
  summary: string;
  content: string;
  category?: string;
  owner?: string;
  status: string;
  version: string;
  effective_date?: string;
  review_date?: string;
  acknowledgement_required: boolean;
  created_at: string;
}
