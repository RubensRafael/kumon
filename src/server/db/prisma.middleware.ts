import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types'
import { createPrismaClient } from './client'

/**
 * Injeta um Prisma Client no contexto da requisicao (`c.get('prisma')`).
 *
 * Instanciar o client nao abre conexao — o Driver Adapter do Neon so conecta na
 * primeira query —, entao o custo aqui e desprezivel e cada requisicao fica com
 * seu proprio client, como manda o modelo de execucao da Edge.
 */
export const prismaMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('prisma', createPrismaClient(c.env.DATABASE_URL))
  await next()
})
