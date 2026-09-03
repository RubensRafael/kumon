import { Hono } from 'hono'

import type { ApiResponse } from '../../shared/api/contract'
import type { DatabaseHealth } from '../../shared/dto'
import type { AppEnv } from '../types'

/**
 * GET /api/health
 *
 * Alem do "estou vivo", faz um `SELECT 1` real no Neon atraves do Driver
 * Adapter — e o jeito mais barato de provar que Worker, adapter e banco estao
 * conversando de ponta a ponta.
 */
export const healthRoute = new Hono<AppEnv>().get('/', async (c) => {
  const database = await checkDatabase(c.get('prisma'))

  // A anotacao e o que amarra a rota ao contrato: devolver qualquer outra
  // coisa quebra a compilacao do servidor.
  const body: ApiResponse<'health'> = {
    status: database.connected ? 'ok' : 'degraded',
    runtime: 'cloudflare-workers',
    environment: c.get('env').BACKEND_ENVIRONMENT,
    timestamp: new Date().toISOString(),
    database,
  }

  return c.json(body, database.connected ? 200 : 503)
})

async function checkDatabase(prisma: AppEnv['Variables']['prisma']): Promise<DatabaseHealth> {
  const startedAt = Date.now()

  try {
    await prisma.$queryRaw`SELECT 1`
    return { connected: true, latencyMs: Date.now() - startedAt, error: null }
  } catch (error) {
    return {
      connected: false,
      latencyMs: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao consultar o banco.',
    }
  }
}
