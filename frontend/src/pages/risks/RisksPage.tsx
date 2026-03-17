import { Routes, Route } from "react-router-dom";
import RiskListPage from "./RiskListPage";
import RiskDetailPage from "./RiskDetailPage";
import RiskHeatmapPage from "./RiskHeatmapPage";
import RiskTreatmentPage from "./RiskTreatmentPage";

export default function RisksPage() {
  return (
    <Routes>
      <Route index element={<RiskListPage />} />
      <Route path="heatmap" element={<RiskHeatmapPage />} />
      <Route path="treatment" element={<RiskTreatmentPage />} />
      <Route path=":id" element={<RiskDetailPage />} />
    </Routes>
  );
}
