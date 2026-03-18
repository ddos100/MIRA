import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/utils/cn";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Select...",
  error,
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(val: string) {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  }

  function remove(val: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
  }

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <div
        className={cn(
          "relative min-h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm cursor-pointer",
          "focus-visible:outline-none",
          error && "border-destructive",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <div className="flex flex-wrap gap-1 pr-6 min-h-7 items-center py-0.5">
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((lbl, i) => (
              <span
                key={value[i]}
                className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-xs"
              >
                {lbl}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={(e) => remove(value[i], e)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-md">
          <div className="p-1 border-b border-border">
            <input
              autoFocus
              className="w-full bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No options found
            </div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                  value.includes(opt.value) && "bg-accent/50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(opt.value);
                }}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value.includes(opt.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
