import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), upsert: vi.fn(), single: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: mocks.invoke },
  from: () => ({ upsert: mocks.upsert }),
} }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
import TeamTab from './TeamTab';
const id = 'aa170000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.invoke.mockResolvedValue({ data: { admins: [{ user_id: id, email: 'legacy@example.invalid', full_name: 'Legacy', allowed_modules: [] }] }, error: null });
  mocks.upsert.mockReturnValue({ select: () => ({ single: mocks.single }) });
});
async function restrictLegacy() {
  render(<TeamTab />);
  const row = (await screen.findByText('legacy@example.invalid')).closest('tr')!;
  fireEvent.click(within(row).getAllByRole('button')[0]);
  fireEvent.click(within(row).getByRole('checkbox', { name: 'Configurações' }));
  fireEvent.click(within(row).getAllByRole('button')[0]);
}
it('creates the permission row when restricting a legacy full admin', async () => {
  mocks.single.mockResolvedValue({ data: { user_id: id }, error: null });
  await restrictLegacy();
  await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith({ user_id: id, allowed_modules: ['configuracoes'] }, { onConflict: 'user_id' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'Permissões atualizadas!' }));
});
it('does not report success when the server rejects last-full restriction', async () => {
  mocks.single.mockResolvedValue({ data: null, error: { message: 'Mantenha pelo menos um administrador com acesso total' } });
  await restrictLegacy();
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro' })));
  expect(mocks.toast).not.toHaveBeenCalledWith({ title: 'Permissões atualizadas!' });
});
