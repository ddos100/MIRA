import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import ProcessingActivitiesPage from "./ProcessingActivitiesPage";
import DPIAListPage from "./DPIAListPage";
import DSRListPage from "./DSRListPage";
import ConsentRecordsPage from "./ConsentRecordsPage";
import { cn } from "@/utils/cn";

const navItems = [
  { to: "/privacy", label: "RoPA (Article 30)", end: true },
  { to: "/privacy/dpias", label: "DPIAs" },
  { to: "/privacy/dsr", label: "Data Subject Requests" },
  { to: "/privacy/consents", label: "Consent (Art. 7)" },
];

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      {/* Top nav bar */}
      <nav className="flex gap-1 border-b border-border">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<ProcessingActivitiesPage />} />
        <Route path="dpias" element={<DPIAListPage />} />
        <Route path="dsr" element={<DSRListPage />} />
        <Route path="consents" element={<ConsentRecordsPage />} />
        <Route path="*" element={<Navigate to="/privacy" replace />} />
      </Routes>
    </div>
  );
}
