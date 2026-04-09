import { Route, Routes } from "react-router-dom";
import ComplianceProgramListPage from "./ComplianceProgramListPage";
import ComplianceFrameworkListPage from "./ComplianceFrameworkListPage";
import ComplianceFrameworkDetailPage from "./ComplianceFrameworkDetailPage";
import ComplianceGapPage from "./ComplianceGapPage";
import ComplianceProgramDetailPage from "./ComplianceProgramDetailPage";
import FrameworkTemplatesPage from "./FrameworkTemplatesPage";

export default function CompliancePage() {
  return (
    <Routes>
      <Route index element={<ComplianceProgramListPage />} />
      <Route path="frameworks" element={<ComplianceFrameworkListPage />} />
      <Route path="frameworks/:id" element={<ComplianceFrameworkDetailPage />} />
      <Route path="gaps" element={<ComplianceGapPage />} />
      <Route path="framework-templates" element={<FrameworkTemplatesPage />} />
      <Route path=":id" element={<ComplianceProgramDetailPage />} />
    </Routes>
  );
}
