import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import MaintenanceGate from "./MaintenanceGate";
vi.mock("@/components/auth/AuthModal", () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
function show(path: string) {
  render(<HelmetProvider><MemoryRouter initialEntries={[path]}><MaintenanceGate><p>Conteúdo do sistema</p></MaintenanceGate></MemoryRouter></HelmetProvider>);
}
it("shows the neutral screen for public routes when enabled", () => {
  vi.stubEnv("VITE_SITE_MAINTENANCE", "true"); show("/roteiros");
  expect(screen.queryByText("Conteúdo do sistema")).toBeNull();
  expect(screen.getByRole("button", { name: "Acesso da equipe" })).toBeInTheDocument();
});
it.each(["/admin", "/admin/produtos", "/reset-password", "/privacidade", "/termos"])("preserves access to %s", path => {
  vi.stubEnv("VITE_SITE_MAINTENANCE", "true"); show(path);
  expect(screen.getByText("Conteúdo do sistema")).toBeInTheDocument();
});
it("does not enable maintenance by default", () => {
  vi.stubEnv("VITE_SITE_MAINTENANCE", ""); show("/");
  expect(screen.getByText("Conteúdo do sistema")).toBeInTheDocument();
});
