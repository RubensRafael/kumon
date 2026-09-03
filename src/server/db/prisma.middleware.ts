import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types'
import { createPrismaClient } from './client'

/** Injeta um Prisma Client, ja apontado para o Neon, em `c.var.prisma`. */
export const prismaMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('prisma', createPrismaClient(c.get('env').BACKEND_DATABASE_URL))
  await next()
})
