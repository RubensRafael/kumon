import { Hono } from 'hono'

import { PainelDadosOutput } from '../../../shared/dto/painel.dto'
import { authMiddleware } from '../../middlewares/auth.middleware'
import type { AppEnv } from '../../types'
import { obterDadosPainel } from './painel.service'

/**
 * Sem `scopeToProfessor`: e leitura pura, sem corte de escopo na query (ver
 * `painel.service.ts`). Qualquer usuario autenticado ve o mesmo snapshot.
 */
export const painelRoutes = new Hono<AppEnv>().get('/', authMiddleware, async (c) => {
  const dados = await obterDadosPainel(c.get('prisma'))
  return c.json(PainelDadosOutput.parse(dados))
})
