import { cn } from "@/utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border border-border text-foreground",
  // Risk ratings
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
  // Compliance
  compliant: "bg-green-100 text-green-800",
  partially_compliant: "bg-yellow-100 text-yellow-800",
  non_compliant: "bg-red-100 text-red-800",
  not_assessed: "bg-gray-100 text-gray-600",
  not_applicable: "bg-gray-100 text-gray-400",
  // Incident severity
  p1: "bg-red-100 text-red-800",
  p2: "bg-orange-100 text-orange-800",
  p3: "bg-yellow-100 text-yellow-800",
  p4: "bg-green-100 text-green-800",
  // Generic statuses
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
  draft: "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
  open: "bg-red-100 text-red-800",
  closed: "bg-gray-100 text-gray-600",
  in_treatment: "bg-blue-100 text-blue-800",
  accepted: "bg-purple-100 text-purple-800",
  transferred: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant] ?? variantClasses.default,
        className
      )}
    >
      {children}
    </span>
  );
}
