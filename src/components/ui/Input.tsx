import React from "react";
import { cn } from "../../lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => (
  <input
    className={cn(
      "h-10 w-full rounded-xl border border-white/15 bg-ink-800 px-3.5 text-sm text-zinc-100",
      "placeholder:text-zinc-500 transition-colors",
      "hover:border-white/25 focus:outline-none focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/25",
      "disabled:opacity-50 disabled:pointer-events-none",
      className
    )}
    {...props}
  />
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => (
  <textarea
    className={cn(
      "w-full rounded-xl border border-white/15 bg-ink-800 px-3.5 py-2.5 text-sm text-zinc-100",
      "placeholder:text-zinc-500 transition-colors",
      "hover:border-white/25 focus:outline-none focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/25",
      "disabled:opacity-50 disabled:pointer-events-none",
      className
    )}
    {...props}
  />
);
