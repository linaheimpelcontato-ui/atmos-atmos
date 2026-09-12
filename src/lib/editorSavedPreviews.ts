import { resolveEditorElement, type SiteTextOverride } from './siteTextOverrides';

export type SavedTextPreview = {
  type: 'text-content'; selector: string; content: string; originalText: string;
  device: string; pathname: string; language: string;
};
export type SavedStylePreview = {
  type: 'override'; selector: string; styles: Record<string,string>; device: string;
};
export type SavedPreview = SavedTextPreview | SavedStylePreview;

export function savedTextRows(changes: SavedPreview[]): SiteTextOverride[] {
  return changes.filter((change): change is SavedTextPreview => change.type === 'text-content').map(change => ({
    pathname:change.pathname,language:change.language,element_selector:change.selector,device:change.device,
    original_text:change.originalText,content:change.content,
  }));
}

export function mergeSavedTextRows(previous: SiteTextOverride[] | undefined, saved: SiteTextOverride[]) {
  const key = (row: SiteTextOverride) => JSON.stringify([row.pathname,row.language,row.element_selector,row.device]);
  const rows = new Map((previous ?? []).map(row => [key(row),row]));
  saved.forEach(row => rows.set(key(row),row));
  return [...rows.values()];
}

// Acknowledgments describe the exact saved revision. A newer edit of the same
// target (or another route/language/device) must keep its pending marker.
export function clearSavedEditorPreviews(root: Document, changes: SavedPreview[], pathname: string, language: string) {
  for (const change of changes) {
    if (change.type !== 'text-content' || change.pathname !== pathname || change.language !== language) continue;
    const element = resolveEditorElement(root,change.selector);
    if (!element) continue;
    let pending: SavedTextPreview | undefined;
    try { pending = JSON.parse(element.getAttribute('data-editor-text-pending') ?? 'null'); } catch { continue; }
    if (pending?.selector === change.selector && pending.pathname === change.pathname && pending.language === change.language &&
      pending.device === change.device && pending.originalText === change.originalText && pending.content === change.content &&
      (element.hasAttribute('data-editor-text-editing') || element.textContent === change.content)) {
      // An open panel protects its draft independently. Clear its older confirmed
      // marker so cancelling the draft cannot leave an already-saved preview stuck.
      element.removeAttribute('data-editor-text-pending');
    }
  }
  const styleElement = root.getElementById('editor-pending-overrides');
  if (!styleElement || !changes.some(change => change.type === 'override')) return;
  const pending: Record<string,Record<string,Record<string,string>>> = JSON.parse(styleElement.getAttribute('data-pending') || '{}');
  for (const change of changes) {
    if (change.type !== 'override') continue;
    const styles = pending[change.device]?.[change.selector];
    if (!styles) continue;
    for (const [key,value] of Object.entries(change.styles)) {
      if (styles[key] === value) delete styles[key];
    }
    if (!Object.keys(styles).length) delete pending[change.device][change.selector];
    if (!Object.keys(pending[change.device]).length) delete pending[change.device];
  }
  styleElement.setAttribute('data-pending',JSON.stringify(pending));
  const grouped: Record<string,string[]> = { all:[],desktop:[],mobile:[] };
  for (const [device,selectors] of Object.entries(pending)) {
    for (const [selector,styles] of Object.entries(selectors)) {
      const escaped = selector.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
      const css = Object.entries(styles).map(([key,value]) => `${key.replace(/[A-Z]/g,m => `-${m.toLowerCase()}`)}: ${value} !important`).join('; ');
      (grouped[device] ?? grouped.all).push(`[data-editor-id="${escaped}"] { ${css} }`);
    }
  }
  styleElement.textContent = [grouped.all.join('\n'),
    grouped.mobile.length ? `@media (max-width: 767px) {\n${grouped.mobile.join('\n')}\n}` : '',
    grouped.desktop.length ? `@media (min-width: 768px) {\n${grouped.desktop.join('\n')}\n}` : '',
  ].join('\n');
}
