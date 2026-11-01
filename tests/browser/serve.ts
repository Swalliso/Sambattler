// The served page for the browser tests that check saved keys (SPEC §13.8): a Vite server for the game,
// or one for the dev site, whose keys all get the `dev/` prefix (src/app/channel.ts). The prototype-save
// cases (protoSaves.test.ts) and the records cases (records.test.ts) share it.
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

/** The prototype preset the dev-site cases run. R2b retires `hotstart` (SPEC §16 R2): change it here. */
export const PROTO = 'hotstart';

const servers: ViteDevServer[] = [];

/**
 * A Vite server for the game, or (`develop`) for the dev site, whose keys all get the `dev/` prefix. The
 * dev site's server keeps its own dependency cache: its config differs, so sharing `node_modules/.vite`
 * would make it and the other test files' servers re-optimize under each other's pages.
 */
export async function serve(mode?: string): Promise<string> {
  const cacheDir = mode ? `node_modules/.vite-${mode}` : undefined;
  const server = await createServer({ mode, cacheDir, server: { host: '127.0.0.1', port: 0, watch: null, hmr: false } });
  servers.push(server);
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite did not open a TCP port');
  return `http://127.0.0.1:${address.port}`;
}

/** Closes every server `serve()` opened (in the test file's `afterAll`). */
export async function closeServers(): Promise<void> {
  for (const server of servers.splice(0)) await server.close();
}
