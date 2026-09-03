import { Hono } from 'hono'

import { authMiddleware } from '../../middlewares/auth.middleware'
import { scopeToProfessor } from '../../middlewares/scope-to-professor.middleware'
import type { AppEnv } from '../../types'
import { PainelOutput } from './painel.dto'
import { obterPainel } from './painel.service'

export const painelRoutes = new Hono<AppEnv>().get('/', authMiddleware, scopeToProfessor, async (c) => {
  const painel = await obterPainel(c.get('prisma'), c.get('escopoProfessorId'))
  return c.json(PainelOutput.parse(painel))
})
