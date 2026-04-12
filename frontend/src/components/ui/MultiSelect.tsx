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
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const DROPDOWN_MAX_H = 240;
    const GAP = 4;

    const spaceBelow = viewportHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const openUp = spaceBelow < DROPDOWN_MAX_H && spaceAbove > spaceBelow;
    const availableH = Math.min(DROPDOWN_MAX_H, openUp ? spaceAbove : spaceBelow);

    if (openUp) {
      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        bottom: viewportHeight - rect.top + GAP,
        maxHeight: availableH,
        zIndex: 99999,
      });
    } else {
      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        top: rect.bottom + GAP,
        maxHeight: availableH,
        zIndex: 99999,
      });
    }
  }, []);

  // Position on open; clear search on close
  useEffect(() => {
    if (open) {
      computePosition();
    } else {
      setSearch("");
    }
  }, [open, computePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Reposition on ancestor scroll; close only when trigger leaves viewport.
  // Scroll events INSIDE the dropdown are ignored so the list stays scrollable.
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
      } else {
        computePosition();
      }
    };
    const onResize = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, computePosition]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
  }

  function remove(val: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
  }

  const selectedOptions = options.filter((o) => value.includes(o.value));

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          // `bg-background` is explicitly opaque — avoids any CSS-variable
          // transparency issues with `bg-popover`.
          // `flex flex-col` + `min-h-0` on the scrollable child is the standard
          // CSS trick that allows a flex item to shrink below its content height
          // and therefore actually scroll within the constrained max-height.
          className="flex flex-col rounded-md border border-border bg-background text-foreground shadow-2xl"
        >
          {/* Fixed search row */}
          <div className="shrink-0 border-b border-border bg-background px-1 py-1">
            <input
              autoFocus
              className="w-full bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>

          {/* Scrollable options: min-h-0 lets this flex child shrink and scroll */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No options</p>
            ) : (
              filtered.map((opt) => {
                const selected = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={cn(
                      "flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      selected && "bg-accent/40"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(opt.value);
                    }}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })
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

      {/* Trigger */}
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "relative min-h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
          error && "border-destructive",
          disabled && "pointer-events-none opacity-50"
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex flex-wrap gap-1 py-0.5 pr-6 min-h-7 items-center">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
              >
                {opt.label}
                <X
                  className="h-3 w-3 hover:text-destructive"
                  onClick={(e) => remove(opt.value, e)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </div>

      {dropdown}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
