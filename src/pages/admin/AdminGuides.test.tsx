import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAppearanceProvider } from "@/components/ui/admin-appearance";

const database = vi.hoisted(() => ({ from: vi.fn(() => { throw new Error("Unexpected database request"); }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: database }));
vi.mock("@/components/admin/guides/GuideDetailSheet", () => ({ default: () => null }));
vi.mock("framer-motion", () => ({
  motion: { div: ({ children, className }: { children: React.ReactNode; className: string }) => <div className={className}>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));
import AdminGuides from "./AdminGuides";

beforeEach(() => {
  database.from.mockClear();
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function openForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["admin-guides"], []);
  client.setQueryData(["waterfall-products"], []);
  render(<QueryClientProvider client={client}><AdminAppearanceProvider><AdminGuides /></AdminAppearanceProvider></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: /novo guia/i }));
}

function tab(name: RegExp) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}

describe("guide form visual and focus structure", () => {
  it("focuses a real field instead of outlining the whole tab panel", async () => {
    openForm();
    const name = screen.getByLabelText(/nome completo/i);
    await waitFor(() => expect(name).toHaveFocus());
    expect(name).toBeRequired();
    expect(name).toHaveClass("admin-field");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("combobox", { name: /vila.*localidade/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /sexo biológico/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/whatsapp principal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute("type", "email");
    const scroller = screen.getByRole("dialog").querySelector("[data-guide-scroll]");
    expect(scroller).toHaveClass("relative", "min-h-0", "overscroll-contain");
    expect(scroller).not.toContainElement(screen.getByRole("button", { name: /efetivar credenciamento/i }));
    expect(database.from).not.toHaveBeenCalled();
  });

  it("keeps entered values and existing logistics controls when switching tabs", () => {
    openForm();
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "Guia de teste visual" } });
    tab(/logística/i);
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "-1");
    fireEvent.click(screen.getByRole("switch", { name: /veículo 4x4/i }));
    expect(screen.getByRole("combobox", { name: /configuração do veículo/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/anotações do condutor/i), { target: { value: "Apenas no formulário, sem salvar" } });
    tab(/^geral$/i);
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue("Guia de teste visual");
    tab(/logística/i);
    expect(screen.getByLabelText(/anotações do condutor/i)).toHaveValue("Apenas no formulário, sem salvar");
    expect(database.from).not.toHaveBeenCalled();
  });

  it("keeps the waterfall prerequisite and cancel action without writing data", () => {
    openForm();
    tab(/cachoeiras/i);
    expect(screen.getByText(/primeiro, salve o guia/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(database.from).not.toHaveBeenCalled();
  });
});
