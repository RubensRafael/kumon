import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

import type { AppEnv } from '../types'

/**
 * Bloqueia rotas admin-only. Sempre depois de `authMiddleware` na cadeia —
 * depende de `c.var.usuario` ja estar setado.
 *
 * Este e um dos poucos pontos da API onde um `professor` recebe `403` em vez
 * de um recorte silencioso: gestao de usuario e dado sensivel de credencial,
 * nao uma questao de "visibilidade por escopo" (ver `plan.md`, apendice
 * "Erros preveniveis pela UI").
 */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('usuario').papel !== 'admin') {
    throw new HTTPException(403, { message: 'Apenas administradores podem acessar este recurso.' })
  }

  await next()
})
