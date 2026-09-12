import { useEffect } from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'a' } as { id: string } | null, loading: false },
  navigate: vi.fn(), rpc: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
} }));
import { useAdminGuard, useIsAdmin } from './useAdminGuard';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth = { user: { id: 'a' }, loading: false };
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
describe('admin guard permission boundaries', () => {
  it('preserves full access for an absent permission row', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(useAdminGuard);
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.allowedModules).toEqual([]);
  });
  it('does not turn permission query failure into full access', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
    const { result } = renderHook(useAdminGuard);
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.isAdmin).toBe(false);
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });
  it('discards a full-access result from an earlier session', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.maybeSingle.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValue({ data: { allowed_modules: ['configuracoes'] }, error: null });
    const { result, rerender } = renderHook(useAdminGuard);
    await waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalledTimes(1));
    mocks.auth = { user: { id: 'b' }, loading: false };
    rerender();
    await waitFor(() => expect(result.current.allowedModules).toEqual(['configuracoes']));
    await act(async () => resolveOld({ data: null, error: null }));
    expect(result.current.allowedModules).toEqual(['configuracoes']);
  });
  it('clears useIsAdmin on logout and ignores late role responses', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.rpc.mockReturnValue(new Promise(resolve => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(useIsAdmin);
    mocks.auth = { user: null, loading: false };
    rerender();
    await act(async () => resolveOld({ data: true, error: null }));
    expect(result.current).toBe(false);
  });
});


describe('stable auth identity', () => {
  it('keeps editor content mounted when auth emits a new object for the same user', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { allowed_modules: ['site'] }, error: null });
    const mounted = vi.fn();
    const unmounted = vi.fn();
    function Editor() {
      useEffect(() => { mounted(); return () => { unmounted(); }; }, []);
      return <iframe title="Editor" />;
    }
    function GuardedEditor() {
      const { checking, isAdmin } = useAdminGuard();
      return checking || !isAdmin ? <p>AUTENTICANDO</p> : <Editor />;
    }
    const { rerender } = render(<GuardedEditor />);
    const originalFrame = await screen.findByTitle('Editor');
    for (let event = 0; event < 3; event++) {
      mocks.auth = { user: { id: 'a' }, loading: false };
      await act(async () => { rerender(<GuardedEditor />); });
    }
    expect(screen.getByTitle('Editor')).toBe(originalFrame);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('keeps useIsAdmin true without another request for the same user ID', async () => {
    const { result, rerender } = renderHook(useIsAdmin);
    await waitFor(() => expect(result.current).toBe(true));
    mocks.rpc.mockReturnValue(new Promise(() => {}));
    mocks.auth = { user: { id: 'a' }, loading: false };
    rerender();
    expect(result.current).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('resets the main guard on logout and ignores a late permissions response', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.maybeSingle.mockReturnValue(new Promise(resolve => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(useAdminGuard);
    await waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalledTimes(1));
    mocks.auth = { user: null, loading: false };
    rerender();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.checking).toBe(false);
    await act(async () => resolveOld({ data: { allowed_modules: ['site'] }, error: null }));
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.allowedModules).toEqual([]);
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });
});
