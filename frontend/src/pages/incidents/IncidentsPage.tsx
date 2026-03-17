import { Routes, Route } from "react-router-dom";
import IncidentListPage from "./IncidentListPage";
import IncidentDetailPage from "./IncidentDetailPage";

export default function IncidentsPage() {
  return (
    <Routes>
      <Route index element={<IncidentListPage />} />
      <Route path=":id" element={<IncidentDetailPage />} />
    </Routes>
  );
}
