import path from 'node:path';

/** @returns {import('vite').InlineConfig} */
export function homologViteConfig(root, supabaseUrl) {
  // Local frontend URLs alone do not guarantee an isolated database.
  if (supabaseUrl !== 'http://127.0.0.1:54321') {
    throw new Error('Homologação exige VITE_SUPABASE_URL=http://127.0.0.1:54321 em .env.homolog.local.');
  }

  return {
    root,
    mode: 'homolog',
    // 8084 and Vitest use .vite. A second Vite mode must not share the
    // optimizer's files: another process can invalidate/remove its chunks.
    cacheDir: path.resolve(root, 'node_modules/.vite-homolog'),
    server: {
      host: '127.0.0.1',
      port: 8088,
      strictPort: true,
      hmr: { clientPort: 8088 },
    },
  };
}
