import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminQuotes from "./AdminQuotes";

const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), toast: vi.fn(), find: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/requestProspect", () => ({ findRequestProspect: mocks.find }));
vi.mock("@/components/admin/ProposalFormDialog", () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.find.mockResolvedValue({ id: "existing-prospect", stage_id: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === "prospects") throw new Error("Browser must not write prospects");
    const result = table === "quote_requests"
      ? [{ id: "request", user_name: "Cliente Teste CRM", user_email: "Person@Example.invalid", user_phone: "12345", status: "pending", created_at: "2026-09-12T12:00:00Z", items: [], answers: {} }]
      : [];
    const q: any = { select: () => q, eq: () => q, order: () => q, limit: () => q,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      insert: (payload: unknown) => { mocks.insert(table, payload); return q; },
      single: () => Promise.resolve({ data: { id: "new-proposal" }, error: null }),
      then: (resolve: any) => Promise.resolve({ data: result, error: null }).then(resolve) };
    return q;
  });
});
afterEach(cleanup);
async function openRequest() {
  const view = render(<MemoryRouter><AdminQuotes segment="b2c" /></MemoryRouter>);
  fireEvent.click(await screen.findByText("Cliente Teste CRM"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Criar Proposta" })).toBeEnabled());
  return view;
}

describe("CRM-02 quote actions reuse server-created prospects", () => {
  it("rechecks the link and creates the draft using the existing id without a prospect insert", async () => {
    await openRequest();
    expect(screen.getByText(/Cliente vinculado ao Pipeline B2C — sem etapa definida/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar Proposta" }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith("proposals", expect.objectContaining({ prospect_id: "existing-prospect", segment: "b2c" })));
    expect(mocks.find).toHaveBeenCalledTimes(2);
    expect(mocks.from).not.toHaveBeenCalledWith("prospects");
  });

  it("does not create a prospect or orphan draft when the server link is missing", async () => {
    mocks.find.mockResolvedValue(null);
    await openRequest();
    expect(screen.getByText(/Cliente ainda não vinculado neste segmento/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar Proposta" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cliente não vinculado" })));
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("fails closed on an ambiguous or failed action-time lookup, despite the previously linked id", async () => {
    await openRequest();
    mocks.find.mockRejectedValue(new Error("Mais de um cliente corresponde ao contato"));
    fireEvent.click(screen.getByRole("button", { name: "Criar Proposta" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Erro ao criar proposta" })));
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("ignores an in-flight lookup after leaving the request screen", async () => {
    const view = await openRequest();
    let resolve!: (value: unknown) => void;
    mocks.find.mockReturnValue(new Promise(r => { resolve = r; }));
    fireEvent.click(screen.getByRole("button", { name: "Criar Proposta" }));
    view.unmount();
    await act(async () => { resolve({ id: "stale-prospect" }); });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
