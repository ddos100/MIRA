import { useState } from "react";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { useUpdateAssessment, type AssessmentStatus } from "@/api/compliance";

interface AssessmentStatusSelectProps {
  assessmentId: string;
  currentStatus: AssessmentStatus;
  onSuccess?: (newStatus: AssessmentStatus) => void;
  className?: string;
}

const STATUS_OPTIONS: { value: AssessmentStatus; label: string }[] = [
  { value: "not_assessed", label: "Not Assessed" },
  { value: "compliant", label: "Compliant" },
  { value: "partially_compliant", label: "Partially Compliant" },
  { value: "non_compliant", label: "Non-Compliant" },
  { value: "not_applicable", label: "Not Applicable" },
];

const STATUS_LABELS: Record<AssessmentStatus, string> = {
  not_assessed: "Not Assessed",
  compliant: "Compliant",
  partially_compliant: "Partially Compliant",
  non_compliant: "Non-Compliant",
  not_applicable: "Not Applicable",
};

export function AssessmentStatusSelect({
  assessmentId,
  currentStatus,
  onSuccess,
  className,
}: AssessmentStatusSelectProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<AssessmentStatus>(currentStatus);
  const mutation = useUpdateAssessment(assessmentId);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as AssessmentStatus;
    setOptimisticStatus(newStatus);
    setIsEditing(false);
    mutation.mutate(
      { status: newStatus },
      {
        onSuccess: () => {
          onSuccess?.(newStatus);
        },
        onError: () => {
          // Revert on error
          setOptimisticStatus(currentStatus);
        },
      }
    );
  };

  if (isEditing) {
    return (
      <select
        autoFocus
        value={optimisticStatus}
        onChange={handleChange}
        onBlur={() => setIsEditing(false)}
        className={cn(
          "rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring",
          className
        )}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      title="Click to change status"
      className={cn(
        "cursor-pointer rounded transition-opacity hover:opacity-80",
        mutation.isPending && "animate-pulse",
        className
      )}
    >
      <Badge variant={optimisticStatus}>
        {STATUS_LABELS[optimisticStatus]}
      </Badge>
    </button>
  );
}
