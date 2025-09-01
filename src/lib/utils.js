import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// For use in vanilla JS/HTML
if (typeof window !== 'undefined') {
  window.cn = cn;
}