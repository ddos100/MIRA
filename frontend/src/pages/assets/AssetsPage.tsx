import { Route, Routes } from "react-router-dom";
import AssetListPage from "./AssetListPage";
import AssetDetailPage from "./AssetDetailPage";

export default function AssetsPage() {
  return (
    <Routes>
      <Route index element={<AssetListPage />} />
      <Route path=":id" element={<AssetDetailPage />} />
    </Routes>
  );
}
