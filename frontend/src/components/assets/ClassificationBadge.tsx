import { cn } from "@/utils/cn";
import type { DataClassification } from "@/api/assets";

interface ClassificationBadgeProps {
  value: DataClassification;
  className?: string;
}

const CLASSIFICATION_CLASSES: Record<DataClassification, string> = {
  public: "bg-green-100 text-green-800",
  internal: "bg-blue-100 text-blue-800",
  confidential: "bg-orange-100 text-orange-800",
  restricted: "bg-red-100 text-red-800",
};

const CLASSIFICATION_LABELS: Record<DataClassification, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted",
};

export function ClassificationBadge({
  value,
  className,
}: ClassificationBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        CLASSIFICATION_CLASSES[value] ?? "bg-gray-100 text-gray-600",
        className
      )}
    >
      {CLASSIFICATION_LABELS[value] ?? value}
    </span>
  );
}
