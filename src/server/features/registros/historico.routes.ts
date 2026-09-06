import { Hono } from 'hono'

import { HistoricoAcompanhamentoOutput, HistoricoQuery } from '../../../shared/dto/historico.dto'
import { validate } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { scopeToProfessor } from '../../middlewares/scope-to-professor.middleware'
import type { AppEnv } from '../../types'
import { obterHistoricoAluno } from './historico.service'

/**
 * Montada em `/alunos` — convive com `alunosRoutes`/`alunoMatriculasRoutes`
 * (padrões de rota não colidem). Agregação por período sobre `RegistroAula`
 * já existente — sem migration, sem endpoint novo de escrita.
 */
export const alunoHistoricoRoutes = new Hono<AppEnv>().get(
  '/:alunoId/registros/historico',
  authMiddleware,
  scopeToProfessor,
  validate('query', HistoricoQuery),
  async (c) => {
    const { periodo } = c.req.valid('query')
    const historico = await obterHistoricoAluno(
      c.get('prisma'),
      c.req.param('alunoId'),
      periodo,
      c.get('escopoProfessorId'),
    )
    return c.json(HistoricoAcompanhamentoOutput.parse(historico))
  },
)
