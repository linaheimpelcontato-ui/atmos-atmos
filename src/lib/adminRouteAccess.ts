export type AdminModule = "site" | "cadastros" | "b2c" | "b2b" | "financeiro" | "ferramentas" | "configuracoes";

const validModules = new Set<string>(["site", "cadastros", "b2c", "b2b", "financeiro", "ferramentas", "configuracoes"]);
export function hasInvalidAdminModules(allowedModules: readonly string[] | null | undefined): boolean {
  if (allowedModules == null) return false;
  return !Array.isArray(allowedModules) || allowedModules.some(module => !validModules.has(module));
}

// Explicit routes prevent newly added pages from inheriting a broad prefix grant.
const routeModules: Record<string, AdminModule> = {
  "/admin": "site",
  "/admin/editor-visual": "site",
  "/admin/mapa": "site",
  "/admin/produtos": "cadastros",
  "/admin/clientes": "cadastros",
  "/admin/guias": "cadastros",
  "/admin/vendedores": "cadastros",
  "/admin/fornecedores": "cadastros",
  "/admin/metas": "ferramentas",
  "/admin/calendario": "ferramentas",
  // This legacy route redirects to B2C regardless of query parameters.
  "/admin/pipeline": "b2c",
  "/admin/b2c/dashboard": "b2c",
  "/admin/b2c/solicitacoes": "b2c",
  "/admin/b2c/pipeline": "b2c",
  "/admin/b2c/propostas": "b2c",
  "/admin/b2b/dashboard": "b2b",
  "/admin/b2b/solicitacoes": "b2b",
  "/admin/b2b/pipeline": "b2b",
  "/admin/b2b/propostas": "b2b",
  "/admin/b2b/reunioes": "b2b",
  "/admin/b2b/descobrir": "b2b",
  "/admin/b2b/templates": "b2b",
  "/admin/financeiro/dashboard": "financeiro",
  "/admin/financeiro/receitas": "financeiro",
  "/admin/financeiro/despesas": "financeiro",
  "/admin/financeiro/contas-receber": "financeiro",
  "/admin/financeiro/contas-pagar": "financeiro",
  "/admin/financeiro/lucro-margem": "financeiro",
  "/admin/financeiro/fluxo-caixa": "financeiro",
  "/admin/financeiro/relatorios": "financeiro",
  "/admin/financeiro/configuracoes": "financeiro",
  "/admin/configuracoes": "configuracoes",
};

/** UI boundary only: database policies remain responsible for data authorization. */
export function canAccessAdminRoute(pathname: string, search: string, allowedModules: readonly string[] | null | undefined): boolean {
  // React Router matches static paths case-insensitively and permits a trailing slash.
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (path !== "/admin" && !path.startsWith("/admin/")) return true;
  if (allowedModules == null || (Array.isArray(allowedModules) && allowedModules.length === 0)) return true;
  if (hasInvalidAdminModules(allowedModules)) return false;
  const module = routeModules[path];
  if (!module || !allowedModules.includes(module)) return false;

  // A query cannot change the route's own permission requirement. If it selects
  // a segment, require that segment too; ambiguous selectors fail closed.
  const segments = new URLSearchParams(search).getAll("segment");
  if (segments.length > 1) return false;
  if (!segments.length) return true;
  const segment = segments[0];
  if (segment === "all") return allowedModules.includes("b2b") && allowedModules.includes("b2c");
  return (segment === "b2b" || segment === "b2c") && allowedModules.includes(segment);
}
