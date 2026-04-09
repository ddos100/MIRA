import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Recalculate position whenever dropdown opens
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      setSearch("");
    }
  }, [open]);

  // Close on click outside (both trigger and portal dropdown)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on scroll/resize to avoid stale position
  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(false);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

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

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-lg"
        >
          <div className="sticky top-0 bg-popover p-1 border-b border-border">
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
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur on trigger
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
        </div>,
        document.body
      )
    : null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <div
        ref={triggerRef}
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

      {dropdown}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
