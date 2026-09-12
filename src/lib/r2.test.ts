import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
vi.mock('./storage', () => ({ MAP_R2_PATH: (path: string) => path }));
import { r2 } from './r2';

beforeEach(() => {
  mocks.getSession.mockReset();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.invalid');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-key');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('uses the current session JWT to request an upload instead of the public project key', async () => {
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'user-session-jwt' } }, error: null });
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ url: 'https://upload.example.invalid/photo' })))
    .mockResolvedValueOnce(new Response(''));
  vi.stubGlobal('fetch', fetch);
  await r2.upload('home','photo.jpg',new File(['image'], 'photo.jpg', { type: 'image/jpeg' }));
  expect(fetch.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer user-session-jwt', apikey: 'public-key', 'Content-Type': 'application/json' });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('does not request an upload when there is no authenticated session', async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  const fetch = vi.fn();vi.stubGlobal('fetch',fetch);
  await expect(r2.upload('home','photo.jpg',new File([], 'photo.jpg'))).rejects.toThrow('Entre com sua conta');
  expect(fetch).not.toHaveBeenCalled();
});
