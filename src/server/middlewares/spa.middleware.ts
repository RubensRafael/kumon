import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types'

/**
 * Fallback da SPA.
 *
 * Em producao os arquivos de `dist/client` sao servidos pela propria Cloudflare
 * atraves do binding de assets. Como o wrangler.jsonc usa
 * `not_found_handling: "none"`, um path sem arquivo correspondente
 * (`/sobre`, `/qualquer/rota`) chega ate aqui — e devolvemos o `index.html`
 * para que o React Router assuma a navegacao no cliente.
 *
 * Em desenvolvimento esta rota nao e alcancada: o `vite.config.ts` exclui do
 * Hono tudo que nao comeca com `/api/`, e o proprio Vite entrega o HTML.
 */
export const spaFallback = createMiddleware<AppEnv>(async (c) => {
  const assets = c.env?.ASSETS

  if (!assets) {
    return c.text(
      'Assets do front-end indisponiveis. Rode `npm run dev` (Vite) ou gere o build com `npm run build` antes de `wrangler dev`.',
      503,
    )
  }

  const indexUrl = new URL('/index.html', c.req.url)
  const response = await assets.fetch(indexUrl)

  if (!response.ok) {
    return c.text('index.html nao encontrado em dist/client. Rode `npm run build`.', 500)
  }

  // Reescreve o status: o asset existe; quem "nao existia" era a rota.
  return new Response(response.body, {
    status: 200,
    headers: response.headers,
  })
})
