import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({upsert:vi.fn(),saveFocal:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({upsert:mocks.upsert})}}));
vi.mock('@/hooks/useFocalPoints',()=>({useSaveFocalPoint:()=>mocks.saveFocal}));
vi.mock('sonner',()=>({toast:{success:mocks.success,error:mocks.error}}));
import AdminVisualEditor from './AdminVisualEditor';
const text=(selector:string,content:string)=>({type:'TEXT_CONTENT_OVERRIDE',selector,content,originalText:'Original',device:'desktop',pathname:'/',language:'pt'});
function send(frame:HTMLIFrameElement,data:unknown,origin=window.location.origin,source:MessageEventSource|null=frame.contentWindow) {
  fireEvent(window,new MessageEvent('message',{data,origin,source}));
}
beforeEach(()=>{vi.resetAllMocks();mocks.upsert.mockResolvedValue({error:null});});
it('disables viewport changes only for the current frame text panel and preserves READY',()=>{
  render(<AdminVisualEditor />);
  const frame=screen.getByTitle('Preview do site') as HTMLIFrameElement;
  const post=vi.spyOn(frame.contentWindow!,'postMessage');
  const mobile=screen.getByRole('button',{name:'Mobile'});
  send(frame,{type:'TEXT_EDITOR_STATE',active:true},'https://foreign.invalid');
  expect(mobile).not.toBeDisabled();
  send(frame,{type:'TEXT_EDITOR_STATE',active:true},window.location.origin,window);
  expect(mobile).not.toBeDisabled();
  send(frame,{type:'TEXT_EDITOR_STATE',active:true});
  expect(mobile).toBeDisabled();fireEvent.click(mobile);expect(frame.style.width).toBe('100%');
  send(frame,{type:'TEXT_EDITOR_STATE',active:false});expect(mobile).not.toBeDisabled();
  fireEvent.click(mobile);expect(frame.style.width).toBe('390px');
  send(frame,{type:'EDITOR_READY'});
  expect(post).toHaveBeenCalledWith({type:'SET_VIEWPORT_MODE',mode:'mobile'},window.location.origin);
});
it('saves only selected text and acknowledges exactly that revision',async()=>{
  render(<AdminVisualEditor />);
  const frame=screen.getByTitle('Preview do site') as HTMLIFrameElement;const post=vi.spyOn(frame.contentWindow!,'postMessage');
  send(frame,text('text-a','Salvar A'));send(frame,text('text-b','Manter B'));
  fireEvent.click(screen.getByRole('button',{name:'Salvar (2)'}));
  fireEvent.click(screen.getByRole('button',{name:/Texto \(pt\): Manter B/}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar (1)'}));
  await waitFor(()=>expect(mocks.success).toHaveBeenCalled());
  expect(mocks.upsert).toHaveBeenCalledWith([expect.objectContaining({element_selector:'text-a',content:'Salvar A'})],{onConflict:'pathname,language,element_selector,device'});
  const acknowledgments=post.mock.calls.filter(([message])=>message.type==='EDITOR_CHANGES_SAVED');
  expect(acknowledgments).toHaveLength(1);
  expect(acknowledgments[0][0].changes).toEqual([{...text('text-a','Salvar A'),type:'text-content'}]);
  expect(post.mock.calls.some(([message])=>message.type==='CLEAR_PENDING_OVERRIDES')).toBe(false);
  expect(screen.getByRole('button',{name:'Salvar (1)'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Mobile'})).toBeDisabled();
});
it('does not acknowledge a failed save or discard its pending text',async()=>{
  mocks.upsert.mockResolvedValue({error:{message:'offline'}});const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  render(<AdminVisualEditor />);const frame=screen.getByTitle('Preview do site') as HTMLIFrameElement;
  const post=vi.spyOn(frame.contentWindow!,'postMessage');send(frame,text('text-a','Salvar A'));
  fireEvent.click(screen.getByRole('button',{name:'Salvar (1)'}));
  fireEvent.click(screen.getAllByRole('button',{name:'Salvar (1)'})[1]);
  await waitFor(()=>expect(mocks.error).toHaveBeenCalled());
  expect(post.mock.calls.some(([message])=>message.type==='EDITOR_CHANGES_SAVED')).toBe(false);
  expect(screen.getByRole('button',{name:'Salvar (1)'})).toBeInTheDocument();log.mockRestore();
});
