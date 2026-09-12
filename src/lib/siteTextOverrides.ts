export interface SiteTextOverride {
  pathname: string;
  language: string;
  element_selector: string;
  device: string;
  original_text: string;
  content: string;
}

export function textEditorId(element: HTMLElement): string {
  const source = element.dataset.editorOriginalText ?? element.textContent ?? '';
  const section = element.closest('section, [data-section]');
  const identity = `${section?.getAttribute('data-section') || section?.id || ''}\0${element.tagName}\0${source}`;
  let hash = 2166136261;
  for (let i=0;i<identity.length;i++) hash = Math.imul(hash ^ identity.charCodeAt(i),16777619);
  return `text-${(hash>>>0).toString(16)}`;
}

// Existing editor selectors use section.tag[index]. Guard text identity too:
// a changed DOM order must never silently replace another paragraph.
export function resolveEditorElement(root: Document, selector: string): HTMLElement | null {
  const explicit = Array.from(root.querySelectorAll<HTMLElement>('[data-editor-id]'))
    .filter(el => el.dataset.editorId === selector);
  if (explicit.length === 1) return explicit[0];
  if (explicit.length > 1) return null;
  if (/^text-[0-9a-f]+$/.test(selector)) {
    const matches = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,p,span,a,label,button,li,strong,em'))
      .filter(el => !el.children.length && !el.closest('[data-editor-ui]') && textEditorId(el) === selector);
    return matches.length === 1 ? matches[0] : null;
  }
  const match = /^(.*)\.([a-z][a-z0-9]*)\[(\d+)\]$/.exec(selector);
  if (!match) return null;
  const [, sectionId, tag, index] = match;
  const sections = Array.from(root.querySelectorAll<HTMLElement>('section, [data-section]'))
    .filter(el => (el.dataset.section || el.id || 'unknown') === sectionId);
  if (sections.length !== 1) return null;
  return sections[0].querySelectorAll<HTMLElement>(tag)[Number(index)] ?? null;
}

export function applySiteText(root: Document, overrides: SiteTextOverride[], width: number) {
  const applicable = overrides.filter(o => o.device === 'all' || o.device === (width < 768 ? 'mobile' : 'desktop'))
    .sort((a,b) => Number(a.device !== 'all') - Number(b.device !== 'all'));
  const effective = new Map(applicable.map(o => [o.element_selector,o]));
  const changed: { element: HTMLElement; original: string; applied: string }[] = [];
  for (const o of effective.values()) {
    const element = resolveEditorElement(root, o.element_selector);
    // Only plain text targets: do not destroy React children, links or icons.
    if (!element || element.children.length || element.closest('[data-editor-ui]')
      || element.hasAttribute('data-editor-text-editing') || element.hasAttribute('data-editor-text-pending')) continue;
    const original = element.dataset.editorOriginalText ?? element.textContent ?? '';
    if (original !== o.original_text) continue;
    const current = element.textContent ?? '';
    if (current !== original && current !== o.content && current !== element.dataset.editorTextApplied) continue;
    element.dataset.editorId = o.element_selector;
    element.dataset.editorOriginalText = original;
    if (element.textContent !== o.content) element.textContent = o.content;
    element.dataset.editorTextApplied = o.content;
    changed.push({ element, original, applied: o.content });
  }
  return changed;
}
