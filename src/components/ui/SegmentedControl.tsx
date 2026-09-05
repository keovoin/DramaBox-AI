import React from "react";
import { cn } from "../../lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

/** Untitled UI SegmentedControl, ported. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-white/10 bg-ink-800 p-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all duration-150 cursor-pointer",
              size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3.5 text-xs",
              active
                ? "bg-brand-600 text-white shadow-sm shadow-brand-950/40"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
