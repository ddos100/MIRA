import { Routes, Route } from "react-router-dom";
import ControlListPage from "./ControlListPage";
import ControlDetailPage from "./ControlDetailPage";

export default function ControlsPage() {
  return (
    <Routes>
      <Route index element={<ControlListPage />} />
      <Route path=":id" element={<ControlDetailPage />} />
    </Routes>
  );
}
