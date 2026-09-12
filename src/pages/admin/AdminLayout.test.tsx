import { useEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ guard: { isAdmin: true, checking: false, allowedModules: ["b2c"] as string[] | undefined }, mount: vi.fn(), unmount: vi.fn() }));
vi.mock("@/hooks/useAdminGuard", () => ({ useAdminGuard: () => state.guard }));
vi.mock("@/lib/storage", () => ({ storageUrl: () => "/test-logo.png" }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => children,
  motion: { div: ({ children, className }: any) => <div className={className}>{children}</div> },
}));
import AdminLayout from "./AdminLayout";

function SensitivePage() {
  useEffect(() => { state.mount(); return () => { state.unmount(); }; }, []);
  return <p>Conteúdo do módulo</p>;
}

function mountAt(path: string) {
  const router = createMemoryRouter([
    { path: "/admin", element: <AdminLayout />, children: [{ path: "*", element: <SensitivePage /> }] },
  ], { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}

beforeEach(() => {
  state.guard = { isAdmin: true, checking: false, allowedModules: ["b2c"] };
  state.mount.mockClear();
  state.unmount.mockClear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: vi.fn(), configurable: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AdminLayout direct route boundary", () => {
  it("does not mount an unauthorized page entered directly and keeps permitted navigation available", () => {
    mountAt("/admin/b2b/propostas");
    expect(screen.getByRole("alert")).toHaveTextContent("Acesso não permitido");
    expect(screen.getByRole("link", { name: "Dashboard B2C" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard B2B" })).not.toBeInTheDocument();
    expect(screen.queryByText("Conteúdo do módulo")).not.toBeInTheDocument();
    expect(state.mount).not.toHaveBeenCalled();
  });

  it("mounts an authorized module and unmounts it immediately on an unauthorized route", async () => {
    const { router } = mountAt("/admin/b2c/propostas");
    expect(screen.getByText("Conteúdo do módulo")).toBeInTheDocument();
    expect(state.mount).toHaveBeenCalledOnce();
    await act(async () => { await router.navigate("/admin/financeiro/receitas"); });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo do módulo")).not.toBeInTheDocument();
    expect(state.unmount).toHaveBeenCalledOnce();
    expect(state.mount).toHaveBeenCalledOnce();
  });

  it("reevaluates query-only segment changes before rendering the outlet", async () => {
    const { router } = mountAt("/admin/b2c/propostas?segment=b2c");
    expect(screen.getByText("Conteúdo do módulo")).toBeInTheDocument();
    await act(async () => { await router.navigate("/admin/b2c/propostas?segment=b2b"); });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(state.mount).toHaveBeenCalledOnce();
    expect(state.unmount).toHaveBeenCalledOnce();
  });

  it("preserves the mounted page when permitted query parameters change", async () => {
    const { router } = mountAt("/admin/b2c/propostas?edit=example");
    await act(async () => { await router.navigate("/admin/b2c/propostas"); });
    expect(screen.getByText("Conteúdo do módulo")).toBeInTheDocument();
    expect(state.mount).toHaveBeenCalledOnce();
    expect(state.unmount).not.toHaveBeenCalled();
  });

  it.each([{ modules: [] }, { modules: undefined }])("preserves full-admin route access for $modules permissions", ({ modules }) => {
    state.guard.allowedModules = modules;
    mountAt("/admin/financeiro/receitas");
    expect(screen.getByText("Conteúdo do módulo")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not mount restricted pages while permission verification is pending", () => {
    state.guard.checking = true;
    state.guard.allowedModules = [];
    mountAt("/admin/financeiro/receitas");
    expect(screen.queryByText("Conteúdo do módulo")).not.toBeInTheDocument();
    expect(state.mount).not.toHaveBeenCalled();
  });

  it.each([["all"], ["b2c", "all"]])("blocks legacy invalid modules and asks for review by a full administrator: %j", (...modules) => {
    state.guard.allowedModules = modules;
    mountAt("/admin/b2c/propostas");
    expect(screen.getByRole("alert")).toHaveTextContent("Solicite a um administrador com acesso total que revise os módulos permitidos");
    expect(screen.queryByRole("link", { name: "Dashboard B2C" })).not.toBeInTheDocument();
    expect(state.mount).not.toHaveBeenCalled();
  });
});
