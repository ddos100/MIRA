import { Routes, Route } from "react-router-dom";
import ContinuityPlanListPage from "./ContinuityPlanListPage";
import ContinuityPlanDetailPage from "./ContinuityPlanDetailPage";
import BIAPage from "./BIAPage";
import ContinuityTestsPage from "./ContinuityTestsPage";

export default function ContinuityPage() {
  return (
    <Routes>
      <Route index element={<ContinuityPlanListPage />} />
      <Route path="bia" element={<BIAPage />} />
      <Route path="tests" element={<ContinuityTestsPage />} />
      <Route path=":id" element={<ContinuityPlanDetailPage />} />
    </Routes>
  );
}
