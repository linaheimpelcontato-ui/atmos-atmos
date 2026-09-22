import { createServer, loadEnv } from 'vite';
import { homologViteConfig } from './homolog-config.mjs';

// A local frontend is not necessarily a local database. Refuse to start this
// test entry point if environment overrides send data to a remote Supabase.
const env = loadEnv('homolog', process.cwd(), 'VITE_');
const server = await createServer(homologViteConfig(process.cwd(), env.VITE_SUPABASE_URL));
await server.listen();
server.printUrls();
