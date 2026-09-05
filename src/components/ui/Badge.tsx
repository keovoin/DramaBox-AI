import React from "react";
import { cn } from "../../lib/cn";

type BadgeVariant =
  | "default"
  | "brand"
  | "amber"
  | "emerald"
  | "indigo"
  | "destructive"
  | "outline"
  | "secondary";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-zinc-200 border-white/15",
  brand: "bg-brand-600 text-white border-brand-600",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
  destructive: "bg-red-500/15 text-red-300 border-red-500/40",
  outline: "bg-transparent text-zinc-300 border-white/20",
  secondary: "bg-ink-700 text-zinc-300 border-white/10",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  className,
  children,
  ...props
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-4",
      variantClasses[variant],
      className
    )}
    {...props}
  >
    {children}
  </span>
);
