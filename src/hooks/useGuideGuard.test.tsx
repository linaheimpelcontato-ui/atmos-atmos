import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { useGuideGuard, useIsGuide } from './useGuideGuard';
const state = vi.hoisted(() => ({ user: { id: 'user-one' } as {id:string}|null, rpc: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({user:state.user, loading:false}) }));
vi.mock('@/integrations/supabase/client', () => ({supabase:{rpc:state.rpc}}));
afterEach(()=>{cleanup();state.user={id:'user-one'};state.rpc.mockReset();});
function wrapper(path='/guia/agenda') {
  const client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  return ({children}: {children:React.ReactNode}) => <QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>{children}</MemoryRouter></QueryClientProvider>;
}
it('authorizes the persisted user relationship without querying guide enum role', async()=>{
  state.rpc.mockResolvedValue({data:{guide_id:'real-guide',is_admin:false,is_preview:false},error:null});
  const {result}=renderHook(()=>useGuideGuard(),{wrapper:wrapper()});
  await waitFor(()=>expect(result.current.guideId).toBe('real-guide'));
  expect(state.rpc).toHaveBeenCalledWith('get_guide_portal_context',{p_preview_guide_id:null});
});
it('never sends fictitious preview IDs to SQL', async()=>{
  const {result}=renderHook(()=>useGuideGuard(),{wrapper:wrapper('/guia/agenda?guide=preview-admin-mode')});
  await waitFor(()=>expect(result.current.error).toBeTruthy());
  expect(state.rpc).not.toHaveBeenCalled();
});
it('admin without a linked guide retains null ID', async()=>{
  state.rpc.mockResolvedValue({data:{guide_id:null,is_admin:true,is_preview:false},error:null});
  const {result}=renderHook(()=>useGuideGuard(),{wrapper:wrapper()});
  await waitFor(()=>expect(result.current.isAdmin).toBe(true));
  expect(result.current.guideId).toBeNull();
});
it('clears guide access on logout',async()=>{
  state.rpc.mockResolvedValue({data:{guide_id:'real-guide',is_admin:false},error:null});
  const {result,rerender}=renderHook(()=>useIsGuide(),{wrapper:wrapper()});
  await waitFor(()=>expect(result.current).toBe(true));
  state.user=null;rerender();
  expect(result.current).toBe(false);
});
it('fails closed on RPC error',async()=>{
  state.rpc.mockResolvedValue({data:null,error:new Error('denied')});
  const {result}=renderHook(()=>useGuideGuard(),{wrapper:wrapper()});
  await waitFor(()=>expect(result.current.error).toBeTruthy());
  expect(result.current.isGuide).toBe(false);
});
