import {
  AlertTriangle,
  BookOpen,
  Brain,
  Building2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Database,
  FileText,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Lock,
  Package,
  Settings,
  ShieldAlert,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { clsx } from "clsx";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Risk Management",
    icon: ShieldAlert,
    children: [
      { label: "Risk Register", href: "/risks" },
      { label: "Treatment Plans", href: "/risks/treatment" },
      { label: "Heat Map", href: "/risks/heatmap" },
    ],
  },
  {
    label: "Compliance",
    icon: CheckSquare,
    children: [
      { label: "Programs", href: "/compliance" },
      { label: "Frameworks", href: "/compliance/frameworks" },
      { label: "Framework Templates", href: "/compliance/framework-templates" },
      { label: "Gap Analysis", href: "/compliance/gaps" },
    ],
  },
  {
    label: "Internal Controls",
    icon: Lock,
    children: [
      { label: "Control Library", href: "/controls" },
      { label: "Audits", href: "/controls/audits" },
      { label: "Issues", href: "/controls/issues" },
    ],
  },
  {
    label: "Policies",
    icon: FileText,
    children: [
      { label: "Policy Library", href: "/policies" },
      { label: "Acknowledgements", href: "/policies/acknowledgements" },
      { label: "Reviews", href: "/policies/reviews" },
    ],
  },
  {
    label: "Exceptions",
    icon: XCircle,
    children: [
      { label: "Exception Register", href: "/exceptions" },
    ],
  },
  {
    label: "Incidents",
    icon: AlertTriangle,
    children: [
      { label: "Incident Register", href: "/incidents" },
    ],
  },
  {
    label: "Data Privacy",
    icon: Database,
    children: [
      { label: "Processing Activities", href: "/privacy" },
      { label: "DPIAs", href: "/privacy/dpias" },
      { label: "Data Subject Requests", href: "/privacy/dsr" },
    ],
  },
  {
    label: "Business Continuity",
    icon: Zap,
    children: [
      { label: "Plans", href: "/continuity" },
      { label: "BIA", href: "/continuity/bia" },
      { label: "Tests", href: "/continuity/tests" },
    ],
  },
  {
    label: "Projects",
    icon: FolderKanban,
    children: [
      { label: "All Projects", href: "/projects" },
    ],
  },
  {
    label: "Assessments",
    icon: ClipboardList,
    children: [
      { label: "Templates", href: "/assessments/templates" },
      { label: "Campaigns", href: "/assessments" },
    ],
  },
  {
    label: "Awareness",
    icon: Brain,
    children: [
      { label: "Programs", href: "/awareness" },
      { label: "Assignments", href: "/awareness/assignments" },
    ],
  },
  { label: "Assets", href: "/assets", icon: Package },
  { label: "Third Parties", href: "/vendors", icon: Globe },
  { label: "Organizations", href: "/organizations", icon: Building2 },
  {
    label: "Users",
    icon: Users,
    children: [
      { label: "All Users", href: "/users" },
      { label: "User Groups", href: "/users/groups" },
    ],
  },
  { label: "Reports", href: "/reports", icon: BookOpen },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "General", href: "/settings" },
      { label: "Status Engine", href: "/settings/status-rules" },
    ],
  },
];

function NavItemComponent({ item }: { item: NavItem }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => location.pathname.startsWith(c.href));
  });

  const Icon = item.icon;

  if (item.href && !item.children) {
    const active = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
    return (
      <Link
        to={item.href}
        className={clsx(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          active
            ? "bg-[hsl(196,90%,48%)] text-[hsl(218,68%,14%)] font-semibold"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={clsx("h-3 w-3 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {item.children?.map((child) => {
            const active =
              child.href === "/settings"
                ? location.pathname === "/settings"
                : location.pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                to={child.href}
                className={clsx(
                  "block px-3 py-1.5 rounded-md text-sm transition-colors",
                  active
                    ? "text-[hsl(196,90%,60%)] font-medium"
                    : "text-white/55 hover:text-white hover:bg-white/10"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <div className="w-64 shrink-0 flex flex-col h-full bg-[hsl(218,68%,14%)] text-white">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[hsl(196,90%,48%)] flex items-center justify-center shadow-lg">
            <ShieldAlert className="h-5 w-5 text-[hsl(218,68%,14%)]" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide text-white">MIRA GRC</p>
            <p className="text-[10px] text-white/50 tracking-widest uppercase">Securisti Consulting</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>
    </div>
  );
}
