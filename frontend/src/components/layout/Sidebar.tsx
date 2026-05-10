import {
  AlertTriangle,
  BookOpen,
  Bot,
  Brain,
  Bug,
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
  Target,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { conductorApi } from "@/api/conductor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ─── Navigation Structure ─────────────────────────────────────────────────────

const navSections: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Organizations", href: "/organizations", icon: Building2 },
      { label: "Assets", href: "/assets", icon: Package },
      { label: "Third Parties", href: "/vendors", icon: Globe },
      { label: "Goals", href: "/organization/goals", icon: Target },
    ],
  },
  {
    title: "Governance",
    items: [
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
        label: "Internal Controls",
        icon: Lock,
        children: [
          { label: "Control Library", href: "/controls" },
          { label: "Audits", href: "/controls/audits" },
          { label: "Issues", href: "/controls/issues" },
        ],
      },
      {
        label: "Exceptions",
        icon: XCircle,
        children: [
          { label: "Exception Register", href: "/exceptions" },
        ],
      },
    ],
  },
  {
    title: "Risk Management",
    items: [
      {
        label: "Risk Register",
        icon: ShieldAlert,
        children: [
          { label: "All Risks", href: "/risks" },
          { label: "Treatment Plans", href: "/risks/treatment" },
          { label: "Heat Map", href: "/risks/heatmap" },
        ],
      },
      { label: "Threats & Vulnerabilities", href: "/threats", icon: Bug },
    ],
  },
  {
    title: "Compliance",
    items: [
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
        label: "Assessments",
        icon: ClipboardList,
        children: [
          { label: "Campaigns", href: "/assessments" },
          { label: "Templates", href: "/assessments/templates" },
        ],
      },
    ],
  },
  {
    title: "Security Operations",
    items: [
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
        label: "Awareness",
        icon: Brain,
        children: [
          { label: "Programs", href: "/awareness" },
          { label: "Assignments", href: "/awareness/assignments" },
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Projects",
        icon: FolderKanban,
        children: [
          { label: "All Projects", href: "/projects" },
        ],
      },
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
          { label: "Webhooks", href: "/settings/webhooks" },
        ],
      },
    ],
  },
];

// ─── Nav Item Component ───────────────────────────────────────────────────────

function NavItemComponent({ item }: { item: NavItem }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => location.pathname.startsWith(c.href));
  });

  const Icon = item.icon;

  if (item.href && !item.children) {
    const active =
      item.href === "/dashboard"
        ? location.pathname === item.href
        : location.pathname === item.href || location.pathname.startsWith(item.href + "/");

    return (
      <Link
        to={item.href}
        className={clsx(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
          active
            ? "bg-[hsl(0,82%,37%)] text-white shadow-sm"
            : "text-white/65 hover:bg-white/8 hover:text-white"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  const anyChildActive = item.children?.some((c) =>
    location.pathname === c.href || location.pathname.startsWith(c.href + "/")
  );

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
          anyChildActive
            ? "text-white bg-white/8"
            : "text-white/65 hover:bg-white/8 hover:text-white"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={clsx("h-3 w-3 transition-transform text-white/40", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="ml-5 mt-0.5 border-l border-white/10 pl-3 space-y-0.5">
          {item.children?.map((child) => {
            const active =
              child.href === "/settings"
                ? location.pathname === "/settings"
                : location.pathname === child.href ||
                  location.pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                to={child.href}
                className={clsx(
                  "block px-2 py-1.5 rounded-md text-xs transition-all",
                  active
                    ? "text-[hsl(0,82%,68%)] font-semibold bg-[hsl(0,82%,37%)]/15"
                    : "text-white/50 hover:text-white hover:bg-white/6"
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

// ─── AI Conductor Nav Section (conditional) ───────────────────────────────────

function ConductorNavSection() {
  const { data } = useQuery({
    queryKey: ["conductor-status"],
    queryFn: () => conductorApi.getStatus().then((r: any) => r.data),
    refetchInterval: 60000,
    retry: false,
  });

  if (!data?.enabled) return null;

  const conductorSection: NavSection = {
    title: "AI Automation",
    items: [
      {
        label: "AI Conductor",
        icon: Bot,
        children: [
          { label: "Overview", href: "/conductor" },
          { label: "Documents", href: "/conductor/documents" },
          { label: "Agents", href: "/conductor/agents" },
          { label: "Connectors", href: "/conductor/connectors" },
          { label: "Findings", href: "/conductor/findings" },
          { label: "AI Settings", href: "/conductor/settings" },
        ],
      },
    ],
  };

  return (
    <div>
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-blue-400/70">
        {conductorSection.title}
      </p>
      <div className="space-y-0.5">
        {conductorSection.items.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <div
      className="w-64 shrink-0 flex flex-col h-full text-white"
      style={{ background: "hsl(0 0% 7%)" }}
    >
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shadow-lg"
            style={{ background: "hsl(0, 82%, 37%)" }}
          >
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide text-white">MIRA GRC</p>
            <p className="text-[10px] text-white/45 tracking-widest uppercase">
              Securisti Consulting
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemComponent key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
        {/* AI Conductor — only shown when CONDUCTOR_ENABLED=true */}
        <ConductorNavSection />
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/8">
        <p className="text-[10px] text-white/25 text-center">v2.0 · MIRA GRC Platform</p>
      </div>
    </div>
  );
}
