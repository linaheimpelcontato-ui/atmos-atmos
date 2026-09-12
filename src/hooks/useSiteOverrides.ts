import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useApplySiteTextOverrides } from './useSiteTextOverrides';
import { resolveEditorElement } from '@/lib/siteTextOverrides';

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
  useApplySiteTextOverrides();
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
      const target = resolveEditorElement(document,o.element_selector);
      if (target) target.dataset.editorId = o.element_selector;
      const escaped = o.element_selector.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
      const sel = `[data-editor-id="${escaped}"]`;
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

    const identify = () => overrides.forEach(o => {
      const target = resolveEditorElement(document,o.element_selector);
      if (target) target.dataset.editorId = o.element_selector;
    });
    const observer = new MutationObserver(identify);
    observer.observe(document.body,{childList:true,subtree:true});

    return () => {
      observer.disconnect();
      document.getElementById("site-overrides")?.remove();
    };
  }, [overrides]);
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}
