import { act, cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminProspects from "./AdminProspects";

const mocks = vi.hoisted(() => ({ from: vi.fn(), toast: vi.fn(), onSync: null as null | (() => Promise<void>) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/admin/ProspectDetailDialog", () => ({ default: () => null }));
vi.mock("@/components/admin/prospects/ProspectFilters", () => ({ ProspectFilters: (props: any) => { mocks.onSync = props.onSync; return null; } }));
vi.mock("@/components/admin/prospects/ProspectTable", () => ({ ProspectTable: () => null }));
vi.mock("@/components/admin/BulkActionBar", () => ({ default: () => null }));
afterEach(cleanup);

it("opening and refreshing clients never imports requests, moves segments or overwrites notes", async () => {
  const existing = [{ id: "p", name: "Cliente B2B", segment: "b2b", email: "person@example.invalid", notes: "Nota manual", stage_id: "negotiating", tags: ["manual"] }];
  const before = structuredClone(existing);
  mocks.from.mockImplementation((table: string) => {
    // Deliberately exposes no mutation method. Any old sync write fails this test.
    const q: any = { select: () => q, order: () => q, eq: () => q, in: () => q,
      then: (resolve: any) => Promise.resolve({ data: table === "prospects" ? existing : [], error: null }).then(resolve) };
    return q;
  });
  render(<MemoryRouter><AdminProspects segment="all" /></MemoryRouter>);
  await waitFor(() => expect(mocks.from).toHaveBeenCalledWith("contacts"));
  await act(() => mocks.onSync!());
  expect(mocks.toast).toHaveBeenCalledWith({ title: "Lista de clientes atualizada" });
  expect(existing).toEqual(before);
  expect(mocks.from.mock.calls.some(([table]) => ["quote_requests", "imersao_leads", "profiles"].includes(table))).toBe(false);
});
