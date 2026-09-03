import { Hono } from 'hono'

import type { ApiError } from '../../shared/dto'
import { prismaMiddleware } from '../db/prisma.middleware'
import { authRoutes, meRoute, usuariosRoutes } from '../features/auth/auth.routes'
import { envMiddleware } from '../middlewares/env.middleware'
import type { AppEnv } from '../types'
import { healthRoute } from './health.route'

/**
 * Router da API, montado sob `/api` em `app.ts` — o mesmo prefixo que o
 * `vite.config.ts` reserva para o Hono em desenvolvimento.
 *
 * O contrato que o front-end enxerga esta em `src/shared/api/contract.ts`; este
 * arquivo nao exporta tipos para o cliente.
 */
export const apiRoutes = new Hono<AppEnv>()

apiRoutes.use('*', envMiddleware)
apiRoutes.use('*', prismaMiddleware)

apiRoutes.route('/health', healthRoute)
apiRoutes.route('/auth', authRoutes)
apiRoutes.route('/me', meRoute)
apiRoutes.route('/usuarios', usuariosRoutes)

/**
 * Catch-all da API.
 *
 * Precisa ser uma rota registrada (e nao `apiRoutes.notFound`): como este
 * router e montado com `app.route('/api', ...)`, o handler de not-found de um
 * sub-app nao e consultado, e um `/api/qualquer-coisa` acabaria caindo no
 * fallback da SPA e recebendo HTML no lugar de JSON.
 */
apiRoutes.all('*', (c) => {
  const body: ApiError = {
    error: 'not_found',
    message: `Rota de API inexistente: ${c.req.method} ${new URL(c.req.url).pathname}`,
  }
  return c.json(body, 404)
})
