import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({parent:{postMessage:vi.fn()},qc:{cancelQueries:vi.fn(),setQueryData:vi.fn(),invalidateQueries:vi.fn()}}));
vi.mock('@tanstack/react-query',()=>({useQueryClient:()=>mocks.qc}));
vi.mock('@/hooks/useFocalPoints',()=>({useFocalPoints:()=>({data:[]})}));
vi.mock('@/contexts/LanguageContext',()=>({useLanguage:()=>({language:'pt'})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import EditorModeListener from './EditorModeListener';
const descriptor=Object.getOwnPropertyDescriptor(window,'parent')!;
function send(data:unknown,origin=window.location.origin) {
  fireEvent(window,new MessageEvent('message',{data,origin,source:mocks.parent as unknown as Window}));
}
beforeEach(()=>{
  vi.resetAllMocks();Object.defineProperty(window,'parent',{configurable:true,value:mocks.parent});
  mocks.qc.cancelQueries.mockResolvedValue(undefined);mocks.qc.invalidateQueries.mockResolvedValue(undefined);
  document.body.innerHTML='<section id="hero"><p>Original</p></section>';
  const p=document.querySelector('p')!;
  Object.defineProperty(p,'innerText',{get(){return p.textContent;},set(value){p.textContent=value;},configurable:true});
  p.style.cssText='font-size:24px;color:black';
});
afterEach(()=>{cleanup();Object.defineProperty(window,'parent',descriptor);document.getElementById('editor-pending-overrides')?.remove();});
it('announces readiness and text panel lifetime, then selectively acknowledges saved previews',async()=>{
  render(<EditorModeListener />);
  expect(mocks.parent.postMessage).toHaveBeenCalledWith({type:'EDITOR_READY'},window.location.origin);
  send({type:'SET_EDITOR_MODE',enabled:true});
  const p=document.querySelector('p')!;fireEvent.click(p);fireEvent.click(screen.getByRole('button',{name:'Editar texto'}));
  expect(mocks.parent.postMessage).toHaveBeenCalledWith({type:'TEXT_EDITOR_STATE',active:true},window.location.origin);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Novo texto'}});
  // A delayed viewport message must not transfer the open edit to mobile.
  send({type:'SET_VIEWPORT_MODE',mode:'mobile'});
  fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));
  const emitted=mocks.parent.postMessage.mock.calls.find(([message])=>message.type==='TEXT_CONTENT_OVERRIDE')![0];
  expect(emitted.device).toBe('desktop');
  const change={...emitted,type:'text-content'};
  expect(JSON.parse(p.getAttribute('data-editor-text-pending')!)).toEqual(change);
  expect(mocks.parent.postMessage).toHaveBeenCalledWith({type:'TEXT_EDITOR_STATE',active:false},window.location.origin);
  const pendingStyle=document.getElementById('editor-pending-overrides')!;
  const before=pendingStyle.textContent;
  send({type:'EDITOR_CHANGES_SAVED',changes:[change]},'https://foreign.invalid');
  expect(mocks.qc.cancelQueries).not.toHaveBeenCalled();
  await act(async()=>send({type:'EDITOR_CHANGES_SAVED',changes:[change]}));
  await waitFor(()=>expect(p.hasAttribute('data-editor-text-pending')).toBe(false));
  expect(mocks.qc.setQueryData).toHaveBeenCalledWith(['site-text-overrides','/','pt'],expect.any(Function));
  expect(p.dataset.editorOriginalText).toBe('Original');
  // Saving content only must preserve the separately unchecked style preview.
  expect(pendingStyle.textContent).toBe(before);
});
