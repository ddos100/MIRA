import { Routes, Route } from "react-router-dom";
import UserListPage from "./UserListPage";
import UserGroupsPage from "./UserGroupsPage";

export default function UsersPage() {
  return (
    <Routes>
      <Route index element={<UserListPage />} />
      <Route path="groups" element={<UserGroupsPage />} />
    </Routes>
  );
}
