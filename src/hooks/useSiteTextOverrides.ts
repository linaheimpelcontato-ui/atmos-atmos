import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { applySiteText, type SiteTextOverride } from '@/lib/siteTextOverrides';

export function useApplySiteTextOverrides() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const { data } = useQuery<SiteTextOverride[]>({
    queryKey: ['site-text-overrides', pathname, language],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('site_text_overrides')
        .select('pathname,language,element_selector,device,original_text,content')
        .eq('pathname',pathname).eq('language',language);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const rows = useRef<SiteTextOverride[]>([]);
  const reconcile = useRef<() => void>(() => {});
  // A refetch is not a navigation/unmount: retain source identity across saves.
  useEffect(() => {
    const managed = new Map<HTMLElement,{original:string;applied:string}>();
    let stopped = false, queued = false;
    rows.current = [];
    const protectedPreview = (element: HTMLElement) =>
      element.hasAttribute('data-editor-text-editing') || element.hasAttribute('data-editor-text-pending');
    const release = (element: HTMLElement, value: {original:string;applied:string}) => {
      if (element.textContent === value.applied) element.textContent = value.original;
      delete element.dataset.editorOriginalText;
      delete element.dataset.editorTextApplied;
      if (element.dataset.editorId?.startsWith('text-')) delete element.dataset.editorId;
    };
    const apply = () => {
      if (stopped) return;
      const applicable = rows.current.filter(row => row.device === 'all' ||
        row.device === (window.innerWidth < 768 ? 'mobile' : 'desktop'));
      for (const [element, value] of managed) {
        if (!element.isConnected) { managed.delete(element); continue; }
        // Removed overrides / device changes restore only our own displayed text.
        // Pending edits keep their identity and preview until their own save is acknowledged.
        if (!protectedPreview(element) && !applicable.some(row =>
          row.element_selector === element.dataset.editorId && row.original_text === value.original)) {
          release(element, value);
          managed.delete(element);
        }
      }
      for (const item of applySiteText(document,rows.current,window.innerWidth)) managed.set(item.element,item);
    };
    reconcile.current = apply;
    const observer = new MutationObserver(() => {
      if (queued || stopped) return;
      queued = true;
      queueMicrotask(() => { queued = false; apply(); });
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,
      attributes:true,attributeFilter:['data-editor-text-pending','data-editor-text-editing']});
    window.addEventListener('resize',apply);
    return () => {
      stopped=true;observer.disconnect();window.removeEventListener('resize',apply);
      reconcile.current = () => {};
      for (const [element,value] of managed) {
        if (!protectedPreview(element)) release(element,value);
      }
      managed.clear();
    };
  }, [pathname,language]);
  useEffect(() => {
    rows.current = (data ?? []).filter(row => row.pathname === pathname && row.language === language);
    reconcile.current();
  }, [data,pathname,language]);
}
