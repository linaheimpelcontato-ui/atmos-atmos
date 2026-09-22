import { lazy, Suspense } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), permissions: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "local-admin" }, loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.permissions }) }) }),
} }));
vi.mock("@/lib/storage", () => ({ storageUrl: () => "/test-logo.png" }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => children,
  motion: { div: ({ children, className }: any) => <div className={className}>{children}</div> },
}));

beforeEach(() => {
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.permissions.mockResolvedValue({ data: { allowed_modules: [] }, error: null });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true,
    value: vi.fn(function (this: HTMLElement, _left: number, top: number) { this.scrollTop = top; }) });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

function mount(goals: React.ReactNode = <p>Página de metas</p>) {
  return render(<MemoryRouter initialEntries={["/admin/b2c/dashboard"]}>
    <Suspense fallback={<p>Carregamento da aplicação inteira</p>}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="b2c/dashboard" element={<p>Página B2C</p>} />
          <Route path="metas" element={goals} />
          <Route path="b2b/dashboard" element={<p>Página B2B</p>} />
          <Route path="b2c/propostas" element={<Link to="?edit=fixture">Abrir proposta</Link>} />
          <Route path="financeiro/receitas" element={<p>Dados financeiros restritos</p>} />
        </Route>
      </Routes>
    </Suspense>
  </MemoryRouter>);
}

describe("admin navigation keeps the sidebar stable", () => {
  it("preserves the same scrolled menu when navigating B2C → Metas → B2B", async () => {
    const { container } = mount();
    await screen.findByText("Página B2C");
    const nav = container.querySelector("aside nav")!;
    nav.scrollTop = 416;
    fireEvent.click(screen.getByRole("link", { name: "Metas" }));
    await screen.findByText("Página de metas");
    expect(container.querySelector("aside nav")).toBe(nav);
    expect(nav.scrollTop).toBe(416);
    fireEvent.click(screen.getByRole("link", { name: "Dashboard B2B" }));
    await screen.findByText("Página B2B");
    expect(container.querySelector("aside nav")).toBe(nav);
    expect(nav.scrollTop).toBe(416);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.permissions).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Dashboard B2B" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps navigation visible while a new page module is loading", async () => {
    let resolvePage!: (page: { default: () => React.ReactNode }) => void;
    const LazyGoals = lazy(() => new Promise<{ default: () => React.ReactNode }>(resolve => { resolvePage = resolve; }));
    const { container } = mount(<LazyGoals />);
    await screen.findByText("Página B2C");
    const nav = container.querySelector("aside nav")!;
    nav.scrollTop = 600;
    fireEvent.click(screen.getByRole("link", { name: "Metas" }));
    expect(await screen.findByText("Carregando página...")).toBeVisible();
    expect(screen.queryByText("Carregamento da aplicação inteira")).not.toBeInTheDocument();
    expect(container.querySelector("aside nav")).toBe(nav);
    expect(nav).toBeVisible();
    expect(nav.scrollTop).toBe(600);
    await act(async () => { resolvePage({ default: () => <p>Metas carregadas</p> }); });
    expect(await screen.findByText("Metas carregadas")).toBeVisible();
    expect(container.querySelector("aside nav")).toBe(nav);
  });

  it("resets only the central page scroller on a route change, not the menu or window", async () => {
    const { container } = mount();
    await screen.findByText("Página B2C");
    const nav = container.querySelector("aside nav")!;
    const content = container.querySelector<HTMLElement>("main > .overflow-y-auto")!;
    content.scrollTop = 800;
    nav.scrollTop = 420;
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(screen.getByRole("link", { name: "Metas" }));
    await screen.findByText("Página de metas");
    expect(container.querySelector("main > .overflow-y-auto")).toBe(content);
    expect(content.scrollTop).toBe(0);
    expect(nav.scrollTop).toBe(420);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("still blocks unauthorized routes after the initial permission check", async () => {
    mocks.permissions.mockResolvedValue({ data: { allowed_modules: ["b2c"] }, error: null });
    render(<MemoryRouter initialEntries={["/admin/b2c/dashboard"]}><Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="b2c/dashboard" element={<Link to="/admin/financeiro/receitas">Tentar acesso direto</Link>} />
        <Route path="financeiro/receitas" element={<p>Dados financeiros restritos</p>} />
      </Route>
    </Routes></MemoryRouter>);
    fireEvent.click(await screen.findByText("Tentar acesso direto"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Acesso não permitido"));
    expect(screen.queryByText("Dados financeiros restritos")).not.toBeInTheDocument();
  });
});
