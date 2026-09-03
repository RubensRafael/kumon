import { Hono } from 'hono'

import type { DatabaseHealth, HealthResponse } from '../../shared/api'
import type { AppEnv } from '../types'

export const healthRoute = new Hono<AppEnv>()

/**
 * GET /api/health
 *
 * Alem do "estou vivo", faz um `SELECT 1` real no Neon atraves do Driver
 * Adapter — e o jeito mais barato de provar que Worker, adapter e banco estao
 * conversando de ponta a ponta.
 */
healthRoute.get('/', async (c) => {
  const database = await checkDatabase(c.get('prisma'))

  const body: HealthResponse = {
    status: database.connected ? 'ok' : 'degraded',
    runtime: 'cloudflare-workers',
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
