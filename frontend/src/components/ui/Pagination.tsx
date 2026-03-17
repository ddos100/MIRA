import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  if (current <= 4) {
    // Near the start
    pages.push(1, 2, 3, 4, 5, "...", total);
  } else if (current >= total - 3) {
    // Near the end
    pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
  } else {
    // In the middle
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const btnBase = cn(
    "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50"
  );

  return (
    <nav
      className="flex items-center gap-1"
      aria-label="Pagination"
    >
      {/* Previous */}
      <button
        className={cn(btnBase, "border border-border hover:bg-accent hover:text-accent-foreground")}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex h-8 min-w-[2rem] items-center justify-center text-sm text-muted-foreground"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={page}
            className={cn(
              btnBase,
              currentPage === page
                ? "bg-primary text-primary-foreground shadow"
                : "border border-border hover:bg-accent hover:text-accent-foreground"
            )}
            onClick={() => onPageChange(page as number)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        className={cn(btnBase, "border border-border hover:bg-accent hover:text-accent-foreground")}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
