import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminProposals from "./AdminProposals";

const mocks = vi.hoisted(() => ({
  from: vi.fn(), update: vi.fn(), in: vi.fn(), toast: vi.fn(), clear: vi.fn(), invalidateQueries: vi.fn(),
  selectedIds: new Set(["p1", "p2"]),
  bulk: null as null | { bulkFields: { key: string }[]; onBulkUpdate: (field: string, value: unknown) => Promise<void> },
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ isLoading: false }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("@/hooks/useRowSelection", () => ({ useRowSelection: () => ({
  selectedIds: mocks.selectedIds, count: mocks.selectedIds.size, clear: mocks.clear,
  toggleAll: vi.fn(), isSelected: () => false,
}) }));
vi.mock("@/components/admin/ProposalFormDialog", () => ({ default: () => null }));
// Capture the real page's handler so stale/forged field submissions bypass the
// select widget in tests, while still exercising its production allowlist.
vi.mock("@/components/admin/BulkActionBar", () => ({ default: (props: typeof mocks.bulk) => {
  mocks.bulk = props;
  return null;
} }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectedIds = new Set(["p1", "p2"]);
  mocks.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue({ in: mocks.in });
  mocks.in.mockResolvedValue({ error: null });
});
afterEach(cleanup);
const mount = () => render(<MemoryRouter><AdminProposals segment="b2c" /></MemoryRouter>);

describe("proposal bulk editing", () => {
  it.each(["discount_percent", "discount_fixed", "tax_percent", "subtotal", "total", "atmos_service", "share_token", "unknown"])(
    "neither offers nor sends forbidden field %s to the database", async field => {
      mount();
      expect(mocks.bulk!.bulkFields.map(option => option.key)).not.toContain(field);
      await act(() => mocks.bulk!.onBulkUpdate(field, 100));
      expect(mocks.from).not.toHaveBeenCalled();
      expect(mocks.clear).not.toHaveBeenCalled();
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
    },
  );

  it("updates permitted metadata for the selected proposals in one statement", async () => {
    mount();
    await act(() => mocks.bulk!.onBulkUpdate("title", "Título revisado"));
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("proposals");
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ title: "Título revisado" });
    expect(mocks.in).toHaveBeenCalledExactlyOnceWith("id", ["p1", "p2"]);
    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-proposals", "b2c"] });
  });

  it("reports database failure without clearing selection or claiming success", async () => {
    mocks.in.mockResolvedValue({ error: { message: "Falha de atualização" } });
    mount();
    await act(() => mocks.bulk!.onBulkUpdate("notes", "Observação"));
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ variant: "destructive" }));
  });

  it("does not send an update with an empty selection", async () => {
    mocks.selectedIds.clear();
    mount();
    await act(() => mocks.bulk!.onBulkUpdate("notes", "Observação"));
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
