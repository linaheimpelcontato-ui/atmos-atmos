import { describe, expect, it } from "vitest";
import { canAccessAdminRoute, type AdminModule } from "./adminRouteAccess";

const moduleRoutes: Record<AdminModule, string[]> = {
  site: ["", "editor-visual", "mapa"],
  cadastros: ["produtos", "clientes", "guias", "vendedores", "fornecedores"],
  ferramentas: ["metas", "calendario"],
  b2c: ["pipeline", "b2c/dashboard", "b2c/solicitacoes", "b2c/pipeline", "b2c/propostas"],
  b2b: ["b2b/dashboard", "b2b/solicitacoes", "b2b/pipeline", "b2b/propostas", "b2b/reunioes", "b2b/descobrir", "b2b/templates"],
  financeiro: ["financeiro/dashboard", "financeiro/receitas", "financeiro/despesas", "financeiro/contas-receber", "financeiro/contas-pagar", "financeiro/lucro-margem", "financeiro/fluxo-caixa", "financeiro/relatorios", "financeiro/configuracoes"],
  configuracoes: ["configuracoes"],
};

describe("admin route permission matrix", () => {
  for (const [module, routes] of Object.entries(moduleRoutes)) {
    it.each(routes)(`${module} owns /admin/%s and other single-module grants cannot enter`, suffix => {
      const path = suffix ? `/admin/${suffix}` : "/admin";
      expect(canAccessAdminRoute(path, "", [module])).toBe(true);
      for (const other of Object.keys(moduleRoutes).filter(key => key !== module)) {
        expect(canAccessAdminRoute(path, "", [other])).toBe(false);
      }
    });
  }

  it.each([{ modules: [] }, { modules: null }, { modules: undefined }])("preserves full administrator semantics for $modules", ({ modules }) => {
    expect(canAccessAdminRoute("/admin/financeiro/receitas", "", modules)).toBe(true);
    expect(canAccessAdminRoute("/admin/new-page", "?segment=unknown", modules)).toBe(true);
  });

  it.each(["/admin/new-page", "/admin/b2c/new-page", "/admin/financeiro/receitas/export", "/admin/b2c/propostas-extra"])("denies unmapped routes even when all seven modules are explicit: %s", path => {
    expect(canAccessAdminRoute(path, "", Object.keys(moduleRoutes))).toBe(false);
  });

  it.each([["all"], ["b2c", "all"], ["site", "unknown"], ["B2C"]])("fails closed for legacy or invalid module keys without interpreting them as full access: %j", (...modules) => {
    expect(canAccessAdminRoute("/admin/b2c/propostas", "", modules)).toBe(false);
    expect(canAccessAdminRoute("/admin", "", modules)).toBe(false);
  });

  it("matches the router's case and trailing-slash behavior without accepting prefixes", () => {
    expect(canAccessAdminRoute("/ADMIN/B2C/PROPOSTAS/", "?edit=example", ["b2c"])).toBe(true);
    expect(canAccessAdminRoute("/ADMIN/B2B/PROPOSTAS/", "", ["b2c"])).toBe(false);
  });

  it("never lets a query segment substitute for route ownership", () => {
    expect(canAccessAdminRoute("/admin/b2b/propostas", "?segment=b2c", ["b2c"])).toBe(false);
    expect(canAccessAdminRoute("/admin/b2c/propostas", "?segment=b2b", ["b2c"])).toBe(false);
    expect(canAccessAdminRoute("/admin/b2c/propostas", "?segment=b2c", ["b2c"])).toBe(true);
    expect(canAccessAdminRoute("/admin/pipeline", "?segment=b2b", ["b2b"])).toBe(false);
    expect(canAccessAdminRoute("/admin/clientes", "?segment=b2b", ["cadastros", "b2b"])).toBe(true);
    expect(canAccessAdminRoute("/admin/clientes", "?segment=all", ["cadastros", "b2c"])).toBe(false);
    expect(canAccessAdminRoute("/admin/clientes", "?segment=all", ["cadastros", "b2c", "b2b"])).toBe(true);
  });

  it.each(["?segment=", "?segment=unknown", "?segment=b2c&segment=b2b", "?segment=b2c&segment=b2c"])("fails closed for ambiguous or unknown segment selectors: %s", search => {
    expect(canAccessAdminRoute("/admin/b2c/propostas", search, ["b2c", "b2b"])).toBe(false);
  });

  it.each(["/", "/perfil", "/wishlist", "/proposta/example", "/guia/agenda", "/admin-example"])("does not impose admin modules on public, customer or guide routes: %s", path => {
    expect(canAccessAdminRoute(path, "", ["site"])).toBe(true);
  });
});
