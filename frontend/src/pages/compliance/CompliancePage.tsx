import { Route, Routes } from "react-router-dom";
import ComplianceProgramListPage from "./ComplianceProgramListPage";
import ComplianceFrameworkListPage from "./ComplianceFrameworkListPage";
import ComplianceGapPage from "./ComplianceGapPage";
import ComplianceProgramDetailPage from "./ComplianceProgramDetailPage";

export default function CompliancePage() {
  return (
    <Routes>
      <Route index element={<ComplianceProgramListPage />} />
      <Route path="frameworks" element={<ComplianceFrameworkListPage />} />
      <Route path="gaps" element={<ComplianceGapPage />} />
      <Route path=":id" element={<ComplianceProgramDetailPage />} />
    </Routes>
  );
}
