import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { ProposalCostChecklistButton } from './ProposalCostChecklist';

// Mirror the mocks used by ProposalCostChecklist.test.tsx: supabase read + toast.
const mocks = vi.hoisted(() => ({ data: [] as unknown[], rpc: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: async () => ({ data: mocks.data, error: null }) }) }), rpc: mocks.rpc },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.data = []; });

const renderButton = (props: { proposalId: string | null; grid: unknown[]; onClick: () => void }) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ProposalCostChecklistButton {...(props as any)} />
    </QueryClientProvider>,
  );

// A cost that came from the catalog (has catalog_item_id) and is already persisted (has id).
const catalogCost = { id: 'item-A', day_number: 1, item_index: 0, item_name: 'Serviço A', category: 'Service', catalog_item_id: 'product-A', cost: 100, value: 200, qty: 1 };
// The screenshot scenario: a hand-typed operational cost, no catalog link.
const manualCost = { id: 'manual-1', day_number: 1, item_index: 0, item_name: '234', category: 'Service', catalog_item_id: null, cost: 400, value: 400, qty: 1 };

it('hides "Validar Custos" for a manual cost with no catalog_item_id (screenshot case)', () => {
  renderButton({ proposalId: 'proposal', grid: [manualCost], onClick: vi.fn() });
  expect(screen.queryByRole('button')).toBeNull();
});

it('hides the button while the proposal is not saved yet (no proposalId)', () => {
  renderButton({ proposalId: null, grid: [catalogCost], onClick: vi.fn() });
  expect(screen.queryByRole('button')).toBeNull();
});

it('renders an enabled, clickable "Validar Custos" with a pending badge for a saved catalog cost', async () => {
  const onClick = vi.fn();
  renderButton({ proposalId: 'proposal', grid: [catalogCost], onClick });

  const button = await screen.findByRole('button', { name: 'Validar Custos' });
  expect(button).toBeEnabled();
  // No verified checks loaded → 1 pending item shown in the badge.
  expect(screen.getByText('1')).toBeInTheDocument();

  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});
