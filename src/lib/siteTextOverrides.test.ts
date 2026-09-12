import { beforeEach, describe, expect, it } from 'vitest';
import { applySiteText, resolveEditorElement, textEditorId, type SiteTextOverride } from './siteTextOverrides';
const item = (selector:string,extra:Partial<SiteTextOverride>={}):SiteTextOverride => ({
  pathname:'/',language:'pt',element_selector:selector,device:'all',original_text:'Original',content:'Revisado',...extra,
});
beforeEach(()=>{document.body.innerHTML='<section id="hero"><p>Original</p></section>';});
describe('site text persistence identity',()=>{
  it('resolves a fresh public render and inserts HTML-looking content as plain text',()=>{
    const p=document.querySelector('p')!;
    const id=textEditorId(p);
    applySiteText(document,[item(id,{content:'<img src=x onerror=alert(1)>'})],1024);
    expect(p.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(p.children.length).toBe(0);
  });
  it('does not redirect a text override when layout order changes',()=>{
    const id=textEditorId(document.querySelector('p')!);
    document.querySelector('section')!.insertAdjacentHTML('afterbegin','<p>Another paragraph</p>');
    applySiteText(document,[item(id)],1024);
    expect(document.querySelectorAll('p')[0].textContent).toBe('Another paragraph');
    expect(document.querySelectorAll('p')[1].textContent).toBe('Revisado');
    document.body.innerHTML='<section id="hero"><p>Different source</p></section>';
    applySiteText(document,[item('hero.p[0]')],1024);
    expect(document.querySelector('p')!.textContent).toBe('Different source');
  });
  it('fails closed for ambiguous targets and nested React content',()=>{
    const id=textEditorId(document.querySelector('p')!);
    document.querySelector('section')!.insertAdjacentHTML('beforeend','<p>Original</p>');
    expect(resolveEditorElement(document,id)).toBeNull();
    document.body.innerHTML='<section id="hero"><p><a href="/">Original</a></p></section>';
    applySiteText(document,[item('hero.p[0]')],1024);
    expect(document.querySelector('a')).not.toBeNull();
  });
  it('selects one device override, and repeated application does not mutate the DOM',()=>{
    const id=textEditorId(document.querySelector('p')!);
    const rows=[item(id),item(id,{device:'mobile',content:'Celular'})];
    applySiteText(document,rows,390);
    const textNode=document.querySelector('p')!.firstChild;
    applySiteText(document,rows,390);
    expect(document.querySelector('p')!.firstChild).toBe(textNode);
    expect(textNode!.textContent).toBe('Celular');
    applySiteText(document,rows,1024);
    expect(document.querySelector('p')!.textContent).toBe('Revisado');
  });
  it('does not fight a pending edit',()=>{
    const p=document.querySelector('p')!;const id=textEditorId(p);
    p.setAttribute('data-editor-text-pending','');applySiteText(document,[item(id)],1024);
    expect(p.textContent).toBe('Original');
  });
  it('does not overwrite a new React source on a reused node',()=>{
    const p=document.querySelector('p')!;const id=textEditorId(p);
    applySiteText(document,[item(id)],1024);
    p.textContent='New React content';
    applySiteText(document,[item(id)],1024);
    expect(p.textContent).toBe('New React content');
  });
});
