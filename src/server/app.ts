import { Hono } from 'hono'
import { logger } from 'hono/logger'

import { onError } from './middlewares/error.middleware'
import { spaFallback } from './middlewares/spa.middleware'
import { apiRoutes } from './routes'
import type { AppEnv } from './types'

/**
 * Monta a aplicacao Hono.
 *
 * A ordem importa: `/api/*` primeiro, e so depois o catch-all `*` que devolve
 * o index.html da SPA.
 */
export function createApp() {
  const app = new Hono<AppEnv>()

  app.use('*', logger())
  app.onError(onError)

  app.route('/api', apiRoutes)
  app.get('*', spaFallback)

  return app
}

export type AppType = ReturnType<typeof createApp>
