import { useState, useRef, useEffect, useCallback } from "react";
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

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const maxDropdownHeight = 240; // max-h-60
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      maxHeight: `${Math.min(maxDropdownHeight, openUpward ? spaceAbove : spaceBelow)}px`,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  // Recompute position when dropdown opens
  useEffect(() => {
    if (open) {
      computePosition();
    } else {
      setSearch("");
    }
  }, [open, computePosition]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Reposition on ancestor scroll; close only if trigger scrolls off-screen.
  // Crucially: ignore scroll events that originate inside the dropdown itself.
  useEffect(() => {
    if (!open) return;

    function handleScroll(e: Event) {
      // Scrolling inside the dropdown list — let it scroll, do nothing
      if (dropdownRef.current?.contains(e.target as Node)) return;

      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      // If the trigger has scrolled off-screen, close; otherwise reposition
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
      } else {
        computePosition();
      }
    }

    function handleResize() {
      setOpen(false);
    }

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, computePosition]);

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
          className="overflow-hidden rounded-md border border-border bg-popover shadow-xl flex flex-col"
        >
          {/* Sticky search — not part of the scrollable list */}
          <div className="shrink-0 bg-popover border-b border-border p-1">
            <input
              autoFocus
              className="w-full bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Scrollable option list */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No options found
              </div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
                    value.includes(opt.value) && "bg-accent/50"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
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
