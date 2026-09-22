import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductDialog } from "./ProductDialog";
import { type Product } from "./shared";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => { throw new Error("Unexpected database call"); }) } }));
vi.mock("./ProductMediaTab", () => ({ ProductMediaTab: () => <button type="button">Adicionar mídia</button> }));
vi.mock("./ProductVariationsTab", () => ({ ProductVariationsTab: () => null }));

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mount(allProducts: Product[] = [], editingProduct: Product | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["admin-suppliers"], []);
  const props = { open: true, onOpenChange: vi.fn(), editingProduct, onSave: vi.fn(), isSaving: false,
    allTypes: ["experience", "service"], getTypeLabel: (type: string) => type, allProducts };
  const view = render(<QueryClientProvider client={client}><ProductDialog {...props} /></QueryClientProvider>);
  return { ...props, rerender: (changes: Partial<typeof props>) => view.rerender(
    <QueryClientProvider client={client}><ProductDialog {...props} {...changes} /></QueryClientProvider>,
  ) };
}

const subcategory = () => screen.getByRole("combobox", { name: "Subcategoria" });

function product(subcategory: string): Product {
  return { id: "local-product", name: "Produto local", type: "experience", segment: "b2c",
    description: null, unit_price: 100, cost_price: 50, currency: "BRL", is_active: false,
    created_at: "2026-09-22T12:00:00Z", source_id: null, source_type: null, category: null,
    variables: { subcategory } };
}
async function startNew(name: string) {
  fireEvent.keyDown(subcategory(), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: "+ Criar Nova..." }));
  const input = screen.getByPlaceholderText("Nova subcategoria...");
  fireEvent.change(input, { target: { value: name } });
  return input;
}

describe("product gallery navigation", () => {
  it.each(["new", "existing"])("opens the gallery from the shortcut for a %s product", (mode) => {
    const { onSave } = mount([], mode === "existing" ? product("Trilhas") : null);
    fireEvent.click(screen.getByRole("button", { name: /Galeria de Mídia/ }));
    expect(screen.getByRole("tab", { name: "Galeria" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Galeria" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Adicionar mídia" })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps the product draft when navigating back and resets the scroll to reveal upload controls", async () => {
    mount();
    fireEvent.change(screen.getByPlaceholderText("Ex: Trilha das Sete Quedas"), { target: { value: "Passeio em edição" } });
    const input = await startNew("Trilhas");
    fireEvent.keyDown(input, { key: "Enter" });
    const scroller = screen.getByRole("tabpanel").parentElement!;
    scroller.scrollTop = 400;
    fireEvent.click(screen.getByRole("button", { name: /Galeria de Mídia/ }));
    expect(scroller.scrollTop).toBe(0);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Geral" }), { key: "Enter" });
    expect(screen.getByPlaceholderText("Ex: Trilha das Sete Quedas")).toHaveValue("Passeio em edição");
    await waitFor(() => expect(subcategory()).toHaveTextContent("Trilhas"));
    fireEvent.keyDown(screen.getByRole("tab", { name: "Galeria" }), { key: "Enter" });
    expect(screen.getByRole("button", { name: "Adicionar mídia" })).toBeInTheDocument();
  });

  it("starts at General again when reopening the product dialog", () => {
    const { rerender } = mount();
    fireEvent.click(screen.getByRole("button", { name: /Galeria de Mídia/ }));
    rerender({ open: false });
    rerender({ open: true });
    expect(screen.getByRole("tab", { name: "Geral" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /Galeria de Mídia/ })).toBeInTheDocument();
  });
});

describe("product subcategory creation", () => {
  it("shows the newly confirmed value before the product is saved", async () => {
    const { onSave } = mount();
    await startNew("  Aventura local  ");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar subcategoria" }));
    await waitFor(() => expect(subcategory()).toHaveTextContent("Aventura local"));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.keyDown(subcategory(), { key: "Enter" });
    expect(await screen.findByRole("option", { name: "Aventura local" })).toBeInTheDocument();
  });

  it("confirms with Enter and sends the raw trimmed name only when saving the product", async () => {
    const { onSave } = mount();
    const input = await startNew("  Trilhas e cachoeiras  ");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(subcategory()).toHaveTextContent("Trilhas e cachoeiras"));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText("Ex: Trilha das Sete Quedas"), { target: { value: "Produto local" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar Produto" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Produto local",
      variables: expect.objectContaining({ subcategory: "Trilhas e cachoeiras" }) }));
  });

  it("does not confirm whitespace-only names", async () => {
    mount();
    const input = await startNew("   ");
    expect(screen.getByRole("button", { name: "Confirmar subcategoria" })).toBeDisabled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toBeInTheDocument();
  });

  it("shows an edited product's subcategory even if it is absent from the catalog list", async () => {
    mount([], product("Categoria atual"));
    await waitFor(() => expect(subcategory()).toHaveTextContent("Categoria atual"));
  });

  it("does not duplicate an existing subcategory", async () => {
    mount([product("Trilhas"), { ...product("Trilhas"), id: "another-product" }]);
    const input = await startNew("Trilhas");
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(subcategory(), { key: "Enter" });
    expect(await screen.findAllByRole("option", { name: "Trilhas" })).toHaveLength(1);
  });

  it("allows an existing subcategory named NEW without opening the creation field", async () => {
    const { onSave } = mount([product("NEW")]);
    fireEvent.keyDown(subcategory(), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "NEW" }));
    await waitFor(() => expect(subcategory()).toHaveTextContent("NEW"));
    expect(screen.queryByPlaceholderText("Nova subcategoria...")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar Produto" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ subcategory: "NEW" }) }));
  });

  it.each(["button", "Escape"])("cancels the draft via %s without closing the product or changing its selection", async (method) => {
    const { onOpenChange } = mount([], product("Original"));
    const input = await startNew("Descartar");
    if (method === "Escape") fireEvent.keyDown(input, { key: "Escape" });
    else fireEvent.click(screen.getByRole("button", { name: "Cancelar nova subcategoria" }));
    await waitFor(() => expect(subcategory()).toHaveTextContent("Original"));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("resets an unfinished draft when opening another product", async () => {
    const { rerender } = mount();
    await startNew("Não confirmado");
    rerender({ open: false });
    rerender({ open: true });
    expect(screen.queryByPlaceholderText("Nova subcategoria...")).not.toBeInTheDocument();
    await waitFor(() => expect(subcategory()).toHaveTextContent("Selecionar subcategoria..."));
  });

  it("offers persisted subcategories when opening the next new product", async () => {
    const { rerender } = mount();
    const input = await startNew("Persistida");
    fireEvent.keyDown(input, { key: "Enter" });
    rerender({ open: false });
    rerender({ open: true, allProducts: [product("Persistida")] });
    fireEvent.keyDown(subcategory(), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "Persistida" }));
    await waitFor(() => expect(subcategory()).toHaveTextContent("Persistida"));
  });
});
