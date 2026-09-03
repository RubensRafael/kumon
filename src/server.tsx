/**
 * Entrypoint do Cloudflare Worker.
 *
 * Referenciado por `main` no wrangler.jsonc (build/deploy) e por `entry` do
 * `@hono/vite-dev-server` no vite.config.ts (desenvolvimento). A implementacao
 * vive em `src/server/` — aqui fica apenas a fronteira com o runtime.
 */
import { createApp } from './server/app'

const app = createApp()

export default app
