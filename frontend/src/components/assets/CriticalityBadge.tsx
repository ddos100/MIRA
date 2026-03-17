import { cn } from "@/utils/cn";

interface CriticalityBadgeProps {
  value: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

const CRITICALITY_COLORS: Record<number, string> = {
  1: "bg-gray-400",
  2: "bg-blue-500",
  3: "bg-yellow-400",
  4: "bg-orange-500",
  5: "bg-red-600",
};

const CRITICALITY_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Critical",
};

export function CriticalityBadge({ value, className }: CriticalityBadgeProps) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      title={`Criticality ${value} – ${CRITICALITY_LABELS[value]}`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block h-3 w-3 rounded-full",
            i < value ? CRITICALITY_COLORS[value] : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
