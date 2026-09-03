import { Hono } from 'hono'

import type { ApiErrorResponse } from '../../shared/api'
import { prismaMiddleware } from '../db/prisma.middleware'
import type { AppEnv } from '../types'
import { healthRoute } from './health.route'
import { usersRoute } from './users.route'

/**
 * Router da API. Tudo aqui e montado sob `/api` em `app.ts`, o mesmo prefixo
 * que o `vite.config.ts` reserva para o Hono no ambiente de desenvolvimento.
 */
export const apiRoutes = new Hono<AppEnv>()

apiRoutes.use('*', prismaMiddleware)

apiRoutes.route('/health', healthRoute)
apiRoutes.route('/users', usersRoute)

/**
 * Catch-all da API.
 *
 * Precisa ser uma rota registrada (e nao `apiRoutes.notFound`): como este
 * router e montado com `app.route('/api', ...)`, o handler de not-found de um
 * sub-app nao e consultado, e um `/api/qualquer-coisa` acabaria caindo no
 * fallback da SPA e recebendo HTML no lugar de JSON.
 */
apiRoutes.all('*', (c) => {
  const body: ApiErrorResponse = {
    error: 'not_found',
    message: `Rota de API inexistente: ${c.req.method} ${new URL(c.req.url).pathname}`,
  }
  return c.json(body, 404)
})
