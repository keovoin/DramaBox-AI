import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "amber";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm shadow-brand-950/40",
  secondary: "bg-ink-700 text-zinc-100 hover:bg-ink-600 active:bg-ink-800",
  outline:
    "border border-white/15 bg-transparent text-zinc-200 hover:bg-white/5 hover:border-white/25",
  ghost: "bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white",
  destructive:
    "bg-red-950/60 text-red-300 border border-red-500/40 hover:bg-red-900/60",
  amber:
    "bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-xl",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "default",
  size = "md",
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}) => (
  <button
    className={cn(
      "inline-flex items-center justify-center font-semibold transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
      "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
      variantClasses[variant],
      sizeClasses[size],
      className
    )}
    disabled={disabled || isLoading}
    aria-busy={isLoading}
    {...props}
  >
    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
);
