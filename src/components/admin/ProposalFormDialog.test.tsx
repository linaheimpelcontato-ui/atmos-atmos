import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ProposalFormDialog from "./ProposalFormDialog";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    const result = { data: [], error: null };
    const query = {
      select: () => query, eq: () => query, order: () => query,
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return query;
  },
  rpc: mocks.rpc,
} }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/admin/ProposalCostChecklist", () => ({ default: () => null, ProposalCostChecklistButton: () => null }));

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: { id: "local-proposal" }, error: null });
});
afterEach(cleanup);

function mount() {
  const onClose = vi.fn();
  function Harness() {
    const [open, setOpen] = useState(true);
    return <ProposalFormDialog open={open} segment="b2c" proposalId={null}
      onOpenChange={value => { onClose(value); setOpen(value); }} />;
  }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <Harness />
  </QueryClientProvider>);
  return onClose;
}
const titleInput = () => screen.getByRole("textbox", { name: "Título *" });
const back = () => screen.getByRole("button", { name: "Voltar para propostas" });

describe("proposal editor scrolling and exit", () => {
  it("keeps header and footer outside the single bounded scroll region", () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "Nova Proposta" });
    const scroller = dialog.querySelector("[data-proposal-scroll]")!;
    expect(dialog).toHaveClass("h-[90dvh]", "overflow-hidden", "gap-0");
    expect(scroller).toHaveClass("relative", "min-h-0", "overflow-y-auto", "overscroll-contain");
    expect(scroller.contains(back())).toBe(false);
    expect(scroller.contains(screen.getByRole("button", { name: "Salvar Proposta" }))).toBe(false);
    expect(dialog.querySelector("[data-proposal-header]")).not.toHaveClass("sticky", "backdrop-blur-xl");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    const form = dialog.querySelector("form")!;
    expect(screen.getByRole("button", { name: "Salvar Proposta" })).toHaveAttribute("form", form.id);
  });

  it.each(["Voltar para propostas", "Cancelar"])("closes a pristine proposal using %s without saving", async name => {
    const onClose = mount();
    fireEvent.click(screen.getByRole("button", { name }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onClose).toHaveBeenCalledWith(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("Escape closes a pristine proposal", async () => {
    mount();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("protects unsaved edits, allows continuing, then explicitly discarding", async () => {
    const onClose = mount();
    fireEvent.change(titleInput(), { target: { value: "Rascunho não salvo" } });
    fireEvent.click(back());
    expect(await screen.findByRole("alertdialog", { name: "Alterações não salvas" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(titleInput()).toHaveValue("Rascunho não salvo");
    fireEvent.click(back());
    fireEvent.click(await screen.findByRole("button", { name: "Sair sem salvar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onClose).toHaveBeenCalledWith(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not bypass required fields through Save and exit", async () => {
    mount();
    fireEvent.change(titleInput(), { target: { value: "Só título" } });
    fireEvent.click(back());
    fireEvent.click(await screen.findByRole("button", { name: "Salvar e sair" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("textbox", { name: "Valor do serviço por pessoa/dia" })).toBeInvalid();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each(["footer", "confirmation"])("saves valid data from %s and closes only after success", async source => {
    mount();
    fireEvent.change(titleInput(), { target: { value: "Proposta válida" } });
    const service = screen.getByRole("textbox", { name: "Valor do serviço por pessoa/dia" });
    fireEvent.change(service, { target: { value: "1000" } });
    fireEvent.blur(service);
    if (source === "confirmation") {
      fireEvent.click(back());
      fireEvent.click(await screen.findByRole("button", { name: "Salvar e sair" }));
    } else fireEvent.click(screen.getByRole("button", { name: "Salvar Proposta" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("save_proposal_bundle", expect.objectContaining({
      p_proposal: expect.objectContaining({ title: "Proposta válida", atmos_service: expect.objectContaining({ price_per_person_day: 1000 }) }),
    })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the editor and entered values when saving fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Falha local simulada" } });
    mount();
    fireEvent.change(titleInput(), { target: { value: "Não perder" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Valor do serviço por pessoa/dia" }), { target: { value: "100" } });
    fireEvent.click(back());
    fireEvent.click(await screen.findByRole("button", { name: "Salvar e sair" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Erro ao salvar" })));
    expect(titleInput()).toHaveValue("Não perder");
    expect(back()).toBeEnabled();
  });
});
