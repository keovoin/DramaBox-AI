export type ClassValue = string | number | null | false | undefined;

/** Tiny className combiner (clsx-style, no dependencies). */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}
