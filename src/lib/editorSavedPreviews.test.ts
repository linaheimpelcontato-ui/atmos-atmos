import { beforeEach, expect, it } from 'vitest';
import { clearSavedEditorPreviews, mergeSavedTextRows, savedTextRows, type SavedTextPreview } from './editorSavedPreviews';
import { textEditorId } from './siteTextOverrides';
let saved:SavedTextPreview;
beforeEach(()=>{
  document.body.innerHTML='<section id="hero"><p>Original</p></section>';
  document.getElementById('editor-pending-overrides')?.remove();
  const p=document.querySelector('p')!;
  saved={type:'text-content',selector:textEditorId(p),originalText:'Original',content:'Salvo',pathname:'/',language:'pt',device:'desktop'};
  p.dataset.editorId=saved.selector;p.dataset.editorOriginalText='Original';p.textContent='Salvo';
  p.setAttribute('data-editor-text-pending',JSON.stringify(saved));
});
it('does not acknowledge a newer edit or a different device/route/language',()=>{
  const p=document.querySelector('p')!;
  for(const override of [{device:'mobile'},{pathname:'/other'},{language:'en'},{content:'Antigo'}]) {
    clearSavedEditorPreviews(document,[{...saved,...override}],'/','pt');
    expect(p.hasAttribute('data-editor-text-pending')).toBe(true);
  }
  clearSavedEditorPreviews(document,[saved],'/','pt');expect(p.hasAttribute('data-editor-text-pending')).toBe(false);
  expect(p.dataset.editorOriginalText).toBe('Original');
});
it('removes only saved style values and keeps unchecked selectors/devices/newer values',()=>{
  const style=document.createElement('style');style.id='editor-pending-overrides';
  style.setAttribute('data-pending',JSON.stringify({desktop:{first:{color:'blue',fontSize:'20px'},second:{color:'green'}},mobile:{first:{color:'pink'}}}));
  document.head.append(style);
  clearSavedEditorPreviews(document,[{type:'override',selector:'first',device:'desktop',styles:{color:'red',fontSize:'20px'}}],'/','pt');
  expect(JSON.parse(style.dataset.pending!)).toEqual({desktop:{first:{color:'blue'},second:{color:'green'}},mobile:{first:{color:'pink'}}});
  expect(style.textContent).toContain('color: green');expect(style.textContent).toContain('max-width: 767px');
  expect(style.textContent).not.toContain('font-size');
});
it('merges saved rows without dropping other selectors, languages or devices',()=>{
  const desktop=savedTextRows([saved])[0];const mobile={...desktop,device:'mobile',content:'Celular'};
  const en={...desktop,language:'en',content:'English'};
  expect(mergeSavedTextRows([desktop,mobile,en],[{...desktop,content:'Atualizado'}])).toEqual([{...desktop,content:'Atualizado'},mobile,en]);
});

it('acknowledges an older confirmed revision while an open panel protects the new draft',()=>{
  const p=document.querySelector('p')!;p.setAttribute('data-editor-text-editing','');p.textContent='Rascunho novo';
  clearSavedEditorPreviews(document,[saved],'/','pt');
  expect(p.hasAttribute('data-editor-text-pending')).toBe(false);
  expect(p.hasAttribute('data-editor-text-editing')).toBe(true);
  expect(p.textContent).toBe('Rascunho novo');
});
