import React from "react";
import { cn } from "../../lib/cn";

/** Thin styled scroll region (Untitled UI ScrollArea pattern, dependency-free). */
export const ScrollArea: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn("custom-scrollbar overflow-y-auto", className)} {...props} />
);
