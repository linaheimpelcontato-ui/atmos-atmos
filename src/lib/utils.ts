import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Match the custom Tailwind layer so explicit per-component overrides retain
// the same last-class-wins behavior as numeric z-index utilities.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { z: [{ z: ["overlay"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
