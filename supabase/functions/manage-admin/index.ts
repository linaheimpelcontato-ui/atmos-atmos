import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { action } = body;

    if (action === "add") {
      const { email, allowed_modules } = body;

      // Find user by email
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      let targetUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

      // If user doesn't exist, create an invite
      if (!targetUser) {
        const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
        if (inviteErr) {
          return new Response(JSON.stringify({ error: "Erro ao convidar usuário: " + inviteErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        targetUser = inviteData.user;
      }

      // Add admin role
      await supabaseAdmin.from("user_roles").upsert({ user_id: targetUser.id, role: "admin" }, { onConflict: "user_id,role" });

      // Add permissions
      await supabaseAdmin.from("admin_permissions").upsert(
        { user_id: targetUser.id, allowed_modules: allowed_modules || [] },
        { onConflict: "user_id" }
      );

      return new Response(JSON.stringify({ ok: true, user_id: targetUser.id, invited: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "remove") {
      const { user_id } = body;

      // Prevent removing yourself
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Você não pode remover a si mesmo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabaseAdmin.from("admin_permissions").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      // List all admins with their emails
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
      if (!roles?.length) return new Response(JSON.stringify({ admins: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const userIds = roles.map((r: any) => r.user_id);
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds);
      const { data: perms } = await supabaseAdmin.from("admin_permissions").select("user_id, allowed_modules").in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      const permMap = new Map((perms ?? []).map((p: any) => [p.user_id, p.allowed_modules]));

      const admins = userIds.map((uid: string) => {
        const authUser = users.find((u: any) => u.id === uid);
        return {
          user_id: uid,
          email: authUser?.email ?? "",
          full_name: profileMap.get(uid) ?? null,
          allowed_modules: permMap.get(uid) ?? [],
        };
      });

      return new Response(JSON.stringify({ admins }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
