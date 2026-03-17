import { Routes, Route } from "react-router-dom";
import ControlListPage from "./ControlListPage";
import ControlDetailPage from "./ControlDetailPage";
import ControlAuditsPage from "./ControlAuditsPage";
import ControlIssuesPage from "./ControlIssuesPage";

export default function ControlsPage() {
  return (
    <Routes>
      <Route index element={<ControlListPage />} />
      <Route path="audits" element={<ControlAuditsPage />} />
      <Route path="issues" element={<ControlIssuesPage />} />
      <Route path=":id" element={<ControlDetailPage />} />
    </Routes>
  );
}
