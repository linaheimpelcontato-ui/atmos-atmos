import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { applySiteText, textEditorId, type SiteTextOverride } from '@/lib/siteTextOverrides';
import { clearSavedEditorPreviews, type SavedTextPreview } from '@/lib/editorSavedPreviews';
const state = vi.hoisted(() => ({ rows: [] as SiteTextOverride[], pathname:'/', language:'pt' }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: state.rows }) }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: state.pathname }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: state.language }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase:{} }));
import { useApplySiteTextOverrides } from './useSiteTextOverrides';
const row = (element: HTMLElement, content: string, device='desktop'):SiteTextOverride => ({
  pathname:'/',language:'pt',element_selector:textEditorId(element),device,
  original_text:element.dataset.editorOriginalText ?? element.textContent!,content,
});
const preview = (element: HTMLElement, original: SiteTextOverride, content:string):SavedTextPreview => {
  const change:SavedTextPreview = {type:'text-content',selector:original.element_selector,originalText:original.original_text,
    pathname:original.pathname,language:original.language,device:original.device,content};
  element.textContent=content;
  element.setAttribute('data-editor-text-pending',JSON.stringify(change));
  return change;
};
beforeEach(() => {
  state.pathname='/';state.language='pt';state.rows=[];
  document.body.innerHTML='<section id="hero"><p>Original</p><p>Outro</p></section>';
  Object.defineProperty(window,'innerWidth',{value:1024,writable:true,configurable:true});
});
it('retains source and selector across save acknowledgments and two query refetches', async () => {
  const p=document.querySelector('p')!;const initial=row(p,'Publicado');state.rows=[initial];
  const {rerender,unmount}=renderHook(useApplySiteTextOverrides);
  expect(p.textContent).toBe('Publicado');
  for (const content of ['Primeira edição','Segunda edição']) {
    await act(async () => {
      const saved=preview(p,initial,content);
      clearSavedEditorPreviews(document,[saved],'/','pt');
    });
    // A stale observer pass must not revert the confirmed text while the query updates.
    expect(p.textContent).toBe(content);
    state.rows=[{...initial,content}];
    await act(async()=>rerender());
    expect(p.dataset.editorOriginalText).toBe('Original');
    expect(textEditorId(p)).toBe(initial.element_selector);
    expect(p.dataset.editorId).toBe(initial.element_selector);
  }
  unmount();
  expect(p.textContent).toBe('Original');
  applySiteText(document,state.rows,1024);
  expect(p.textContent).toBe('Segunda edição');
});
it('keeps an unchecked text preview while a different text is saved and refetched', async () => {
  const [a,b]=Array.from(document.querySelectorAll('p'));const first=row(a,'Publicado A'),second=row(b,'Publicado B');
  state.rows=[first,second];const {rerender}=renderHook(useApplySiteTextOverrides);
  const saved=preview(a,first,'Salvo A');preview(b,second,'Pendente B');
  await act(async()=>clearSavedEditorPreviews(document,[saved],'/','pt'));
  state.rows=[{...first,content:'Salvo A'},second];
  await act(async()=>rerender());
  expect(a.textContent).toBe('Salvo A');expect(a.hasAttribute('data-editor-text-pending')).toBe(false);
  expect(b.textContent).toBe('Pendente B');expect(b.hasAttribute('data-editor-text-pending')).toBe(true);
});
it('restores a removed or out-of-device override without losing later desktop application', async () => {
  const p=document.querySelector('p')!;state.rows=[row(p,'Desktop')];
  const {rerender}=renderHook(useApplySiteTextOverrides);
  await act(async()=>{window.innerWidth=390;window.dispatchEvent(new Event('resize'));});
  expect(p.textContent).toBe('Original');
  await act(async()=>{window.innerWidth=1024;window.dispatchEvent(new Event('resize'));});
  expect(p.textContent).toBe('Desktop');
  state.rows=[];await act(async()=>rerender());expect(p.textContent).toBe('Original');
});
it('cleans up on route/language changes and does not overwrite React source replacements', async () => {
  const p=document.querySelector('p')!;const initial=row(p,'Publicado');state.rows=[initial];
  const {rerender}=renderHook(useApplySiteTextOverrides);
  p.textContent='Novo conteúdo React';state.rows=[{...initial}];
  await act(async()=>rerender());expect(p.textContent).toBe('Novo conteúdo React');
  state.pathname='/other';state.language='en';state.rows=[];
  await act(async()=>rerender());
  expect(p.textContent).toBe('Novo conteúdo React');expect(p.dataset.editorOriginalText).toBeUndefined();
});
