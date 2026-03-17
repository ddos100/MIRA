import { Routes, Route } from "react-router-dom";
import VendorListPage from "./VendorListPage";
import VendorDetailPage from "./VendorDetailPage";

export default function VendorsPage() {
  return (
    <Routes>
      <Route index element={<VendorListPage />} />
      <Route path=":id" element={<VendorDetailPage />} />
    </Routes>
  );
}
