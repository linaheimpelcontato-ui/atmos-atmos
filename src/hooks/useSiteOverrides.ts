import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface SiteOverride {
  element_selector: string;
  override_type: string;
  styles: Record<string, string>;
  device: string;
}

/** Fetch all site overrides — cached 5 min */
export function useSiteOverrides() {
  return useQuery<SiteOverride[]>({
    queryKey: ["site-overrides"],
    queryFn: async () => {
      const { data, error } = await db
        .from("site_overrides")
        .select("element_selector, override_type, styles, device");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Apply overrides to the DOM (used in Layout on public site) */
export function useApplySiteOverrides() {
  const { data: overrides } = useSiteOverrides();

  useEffect(() => {
    if (!overrides || overrides.length === 0) return;

    const styleEl = document.createElement("style");
    styleEl.id = "site-overrides";

    // Group rules by device
    const allRules: string[] = [];
    const mobileRules: string[] = [];
    const desktopRules: string[] = [];

    overrides.forEach((o) => {
      const sel = `[data-editor-id="${o.element_selector}"]`;
      const props = Object.entries(o.styles)
        .map(([k, v]) => `${camelToKebab(k)}: ${v} !important`)
        .join("; ");
      const rule = `${sel} { ${props} }`;

      if (o.device === "mobile") {
        mobileRules.push(rule);
      } else if (o.device === "desktop") {
        desktopRules.push(rule);
      } else {
        allRules.push(rule);
      }
    });

    let css = allRules.join("\n");
    if (mobileRules.length > 0) {
      css += `\n@media (max-width: 767px) {\n${mobileRules.join("\n")}\n}`;
    }
    if (desktopRules.length > 0) {
      css += `\n@media (min-width: 768px) {\n${desktopRules.join("\n")}\n}`;
    }

    styleEl.textContent = css;

    // Remove old and append new
    document.getElementById("site-overrides")?.remove();
    document.head.appendChild(styleEl);

    return () => {
      document.getElementById("site-overrides")?.remove();
    };
  }, [overrides]);
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}
