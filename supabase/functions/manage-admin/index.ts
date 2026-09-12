const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const pageSize = 1000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const errorStatus = (error: { code?: string }) =>
  error.code === "42501" ? 403 : error.code === "P0002" ? 404 :
    ["22023", "23514", "23503", "23505", "40001"].includes(error.code ?? "") ? 409 : 500;

// Injected dependencies let tests exercise requests without Auth calls or invitations.
// Supabase's clients have different generated schema types across deployments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createManageAdminHandler(createClient: (...args: any[]) => any, env: Record<string, string | undefined>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
    const authorization = req.headers.get("Authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) return json({ error: "Não autenticado" }, 401);
    try {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
        return json({ error: "Configuração de autenticação indisponível" }, 500);
      }
      const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const user = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authorization! } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: authData, error: authError } = await admin.auth.getUser(match[1]);
      const caller = authData?.user;
      if (authError || !caller) return json({ error: "Não autenticado" }, 401);
      const { data: full, error: guardError } = await user.rpc("is_full_admin", { _user_id: caller.id });
      if (guardError) return json({ error: "Não foi possível validar a permissão de equipe" }, 500);
      if (full !== true) return json({ error: "A gestão de equipe exige administrador com acesso total" }, 403);
      let body;
      try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Ação inválida" }, 400);
      const { action } = body;
      if (!["add", "remove", "list"].includes(action)) return json({ error: "Ação inválida" }, 400);

      const findAuthUsers = async (email?: string) => {
        const result = [];
        for (let page = 1; ; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
          if (error) throw error;
          if (!Array.isArray(data?.users)) throw new Error("Resposta inválida ao consultar usuários");
          if (email) {
            const found = data.users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
            if (found) return [found];
          } else result.push(...data.users);
          if (data.users.length < pageSize) return result;
        }
      };
      const readRows = async (table: string, columns: string, roleFilter = false) => {
        const result = [];
        for (let offset = 0; ; offset += pageSize) {
          let query = user.from(table).select(columns).order(table === "profiles" ? "id" : "user_id");
          if (roleFilter) query = query.eq("role", "admin");
          const { data, error } = await query.range(offset, offset + pageSize - 1);
          if (error) throw error;
          if (!Array.isArray(data)) throw new Error("Resposta inválida ao consultar equipe");
          result.push(...data);
          if (data.length < pageSize) return result;
        }
      };
      if (action === "add") {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const modules = body.allowed_modules;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
          !Array.isArray(modules) || modules.length > 100 ||
          modules.some((m: unknown) => typeof m !== "string" || !["site", "cadastros", "b2c", "b2b", "financeiro", "ferramentas", "configuracoes"].includes(m))) {
          return json({ error: "Informe e-mail válido e módulos explicitamente; lista vazia concede acesso total" }, 400);
        }
        let [target] = await findAuthUsers(email);
        let invited = false;
        if (!target) {
          // Recheck before the external side effect, after potentially lengthy pagination.
          const { data: stillFull, error } = await user.rpc("is_full_admin", { _user_id: caller.id });
          if (error) return json({ error: "Não foi possível validar a permissão de equipe" }, 500);
          if (stillFull !== true) return json({ error: "Sem permissão para convidar equipe" }, 403);
          const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
          if (inviteError || !data?.user) return json({ error: "Erro ao convidar usuário" }, 500);
          target = data.user;
          invited = true;
        }
        const { error } = await user.rpc("manage_admin_team", {
          p_action: "add", p_user_id: target.id, p_allowed_modules: modules,
        });
        if (error) return json({ error: error.message, invited, user_id: target.id }, errorStatus(error));
        return json({ ok: true, user_id: target.id, invited });
      }
      if (action === "remove") {
        if (typeof body.user_id !== "string" || !uuid.test(body.user_id)) return json({ error: "Usuário inválido" }, 400);
        if (body.user_id === caller.id) return json({ error: "Você não pode remover a si mesmo" }, 400);
        const { error } = await user.rpc("manage_admin_team", {
          p_action: "remove", p_user_id: body.user_id, p_allowed_modules: null,
        });
        if (error) return json({ error: error.message }, errorStatus(error));
        return json({ ok: true });
      }
      const roles = await readRows("user_roles", "user_id", true);
      if (!roles.length) return json({ admins: [] });
      const [users, profiles, permissions] = await Promise.all([
        findAuthUsers(), readRows("profiles", "id, full_name"), readRows("admin_permissions", "user_id, allowed_modules"),
      ]);
      // No Auth directory data is returned if authorization changed during the reads.
      const { data: stillFull, error } = await user.rpc("is_full_admin", { _user_id: caller.id });
      if (error) return json({ error: "Não foi possível validar a permissão de equipe" }, 500);
      if (stillFull !== true) return json({ error: "Sem permissão para consultar equipe" }, 403);
      const authMap = new Map(users.map((u) => [u.id, u]));
      const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));
      const permMap = new Map(permissions.map((p) => [p.user_id, p.allowed_modules]));
      return json({ admins: roles.map((r) => ({ user_id: r.user_id,
        email: authMap.get(r.user_id)?.email ?? "", full_name: profileMap.get(r.user_id) ?? null,
        allowed_modules: permMap.get(r.user_id) ?? [],
      })) });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Falha ao gerenciar equipe" }, 500);
    }
  };
}

// Importing this module in tests does not start a server or load a remote module.
const deno = (globalThis as unknown as { Deno?: { env: { get(key: string): string | undefined }; serve: (handler: (req: Request) => Promise<Response>) => void } }).Deno;
if (deno) {
  const clientModule = "https://esm.sh/@supabase/supabase-js@2";
  const { createClient } = await import(/* @vite-ignore */ clientModule);
  deno.serve(createManageAdminHandler(createClient, {
    SUPABASE_URL: deno.env.get("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_ANON_KEY: deno.env.get("SUPABASE_ANON_KEY"),
  }));
}
