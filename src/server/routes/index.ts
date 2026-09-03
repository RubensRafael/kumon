import { Hono } from 'hono'

import type { ApiError } from '../../shared/dto'
import { prismaMiddleware } from '../db/prisma.middleware'
import { envMiddleware } from '../middlewares/env.middleware'
import type { AppEnv } from '../types'
import { healthRoute } from './health.route'
import { usersRoute } from './users.route'

/**
 * Router da API, montado sob `/api` em `app.ts` — o mesmo prefixo que o
 * `vite.config.ts` reserva para o Hono em desenvolvimento.
 */
const api = new Hono<AppEnv>()

api.use('*', envMiddleware)
api.use('*', prismaMiddleware)

export const apiRoutes = api.route('/health', healthRoute).route('/users', usersRoute)

/**
 * Catch-all da API.
 *
 * Precisa ser uma rota registrada (e nao `api.notFound`): como este router e
 * montado com `app.route('/api', ...)`, o handler de not-found de um sub-app
 * nao e consultado, e um `/api/qualquer-coisa` acabaria caindo no fallback da
 * SPA e recebendo HTML no lugar de JSON.
 */
api.all('*', (c) => {
  const body: ApiError = {
    error: 'not_found',
    message: `Rota de API inexistente: ${c.req.method} ${new URL(c.req.url).pathname}`,
  }
  return c.json(body, 404)
})

/**
 * Tipo do router para quem quiser usar o cliente RPC do Hono
 * (`hc<ApiRoutes>('/api')`).
 *
 * O front-end deste projeto NAO usa: o RPC obriga o cliente a importar os
 * tipos do servidor, o que arrastaria o Prisma para o grafo de compilacao do
 * bundle. Em vez disso a SPA consome o contrato de `src/shared/api/contract.ts`,
 * que carrega apenas DTOs.
 */
export type ApiRoutes = typeof apiRoutes
