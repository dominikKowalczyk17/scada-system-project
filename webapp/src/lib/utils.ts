import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  const merged = clsx(inputs);
  const unique = Array.from(new Set(merged.split(' '))).join(' ');
  return twMerge(unique);
}
