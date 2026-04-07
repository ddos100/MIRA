import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Lazy-loaded page components
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const AssessmentPortalPage = lazy(() => import("@/pages/portal/AssessmentPortalPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const RisksPage = lazy(() => import("@/pages/risks/RisksPage"));
const CompliancePage = lazy(() => import("@/pages/compliance/CompliancePage"));
const ControlsPage = lazy(() => import("@/pages/controls/ControlsPage"));
const PoliciesPage = lazy(() => import("@/pages/policies/PoliciesPage"));
const ExceptionsPage = lazy(() => import("@/pages/exceptions/ExceptionsPage"));
const IncidentsPage = lazy(() => import("@/pages/incidents/IncidentsPage"));
const PrivacyPage = lazy(() => import("@/pages/privacy/PrivacyPage"));
const ContinuityPage = lazy(() => import("@/pages/continuity/ContinuityPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const AssessmentsPage = lazy(() => import("@/pages/assessments/AssessmentsPage"));
const AwarenessPage = lazy(() => import("@/pages/awareness/AwarenessPage"));
const AssetsPage = lazy(() => import("@/pages/assets/AssetsPage"));
const VendorsPage = lazy(() => import("@/pages/vendors/VendorsPage"));
const OrganizationsPage = lazy(() => import("@/pages/organizations/OrganizationsPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const StatusRulesPage = lazy(() => import("@/pages/settings/StatusRulesPage"));
const UsersPage = lazy(() => import("@/pages/users/UsersPage"));

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* External portal – no authentication */}
        <Route
          path="/portal/assessment/:token"
          element={<AssessmentPortalPage />}
        />

        {/* Protected app routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* GRC Modules */}
          <Route path="/risks/*" element={<RisksPage />} />
          <Route path="/compliance/*" element={<CompliancePage />} />
          <Route path="/controls/*" element={<ControlsPage />} />
          <Route path="/policies/*" element={<PoliciesPage />} />
          <Route path="/exceptions/*" element={<ExceptionsPage />} />
          <Route path="/incidents/*" element={<IncidentsPage />} />
          <Route path="/privacy/*" element={<PrivacyPage />} />
          <Route path="/continuity/*" element={<ContinuityPage />} />
          <Route path="/projects/*" element={<ProjectsPage />} />
          <Route path="/assessments/*" element={<AssessmentsPage />} />
          <Route path="/awareness/*" element={<AwarenessPage />} />

          {/* Supporting modules */}
          <Route path="/assets/*" element={<AssetsPage />} />
          <Route path="/vendors/*" element={<VendorsPage />} />
          <Route path="/organizations/*" element={<OrganizationsPage />} />

          {/* Users */}
          <Route path="/users/*" element={<UsersPage />} />

          {/* Reports */}
          <Route path="/reports/*" element={<ReportsPage />} />

          {/* Settings */}
          <Route path="/settings/*" element={<SettingsPage />} />
          <Route path="/settings/status-rules" element={<StatusRulesPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
