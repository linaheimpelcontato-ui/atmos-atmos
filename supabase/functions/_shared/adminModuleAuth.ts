// Keep this dependency-injected: tests never contact Auth or invoke integrations.
type AuthClient = {
  auth: { getUser(token: string): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
export type AdminAuthOptions = {
  createClient: (url: string, key: string, options: Record<string, unknown>) => AuthClient;
  supabaseUrl?: string;
  anonKey?: string;
  modules?: string[];
  fullAdmin?: boolean;
};

const reject = (status: number, error: string) => new Response(JSON.stringify({ error }), {
  status,
  headers: {
    'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
  },
});

/** Null authorizes work; every failure returns a response before side effects. */
export async function authorizeAdminRequest(req: Request, options: AdminAuthOptions): Promise<Response | null> {
  if (req.method !== 'POST') return reject(405, 'Método não permitido');
  const authorization = req.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return reject(401, 'Autenticação necessária');
  if (!options.supabaseUrl || !options.anonKey) return reject(503, 'Autorização indisponível');
  try {
    const client = options.createClient(options.supabaseUrl, options.anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return reject(401, 'Autenticação inválida');
    if (options.fullAdmin) {
      const result = await client.rpc('is_full_admin', { _user_id: data.user.id });
      if (result.error) return reject(503, 'Não foi possível validar a autorização');
      return result.data === true ? null : reject(403, 'Administrador com acesso total necessário');
    }
    if (!options.modules?.length) return reject(403, 'Módulo autorizado necessário');
    for (const module of options.modules) {
      const result = await client.rpc('has_admin_module', { p_module: module });
      if (result.error) return reject(503, 'Não foi possível validar a autorização');
      if (result.data === true) return null;
    }
    return reject(403, 'Sem permissão para este módulo');
  } catch {
    return reject(503, 'Não foi possível validar a autorização');
  }
}

function sameSecret(actual: string, expected: string) {
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < Math.max(actual.length, expected.length); index++) {
    difference |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}

/** Scheduled jobs authenticate independently of customer/admin sessions. */
export async function authorizeReminderRequest(req: Request, options: AdminAuthOptions, schedulerSecret?: string) {
  if (req.method !== 'POST') return reject(405, 'Método não permitido');
  const supplied = req.headers.get('x-scheduler-secret');
  if (schedulerSecret && supplied && sameSecret(supplied, schedulerSecret)) return null;
  return authorizeAdminRequest(req, { ...options, fullAdmin: true });
}
