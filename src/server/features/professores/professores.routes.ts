import { Hono } from 'hono'

import { validate, validationErrorBody } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/require-admin.middleware'
import { restrictProfessorSelf } from '../../middlewares/restrict-professor-self.middleware'
import type { AppEnv } from '../../types'
import {
  ProfessorCreateInput,
  ProfessorOutput,
  ProfessorUpdateInputAdmin,
  ProfessorUpdateInputSelf,
} from '../../../shared/dto/professores.dto'
import * as professoresService from './professores.service'

export const professoresRoutes = new Hono<AppEnv>()
  // Diretorio de equipe: qualquer papel autenticado, sem filtro de escopo.
  .get('/', authMiddleware, async (c) => {
    const professores = await professoresService.listarProfessores(c.get('prisma'))
    return c.json(professores.map((professor) => ProfessorOutput.parse(professor)))
  })

  .get('/:id', authMiddleware, async (c) => {
    const professor = await professoresService.buscarProfessor(c.get('prisma'), c.req.param('id'))
    return c.json(ProfessorOutput.parse(professor))
  })

  .post('/', authMiddleware, requireAdmin, validate('json', ProfessorCreateInput), async (c) => {
    const input = c.req.valid('json')
    const professor = await professoresService.criarProfessor(c.get('prisma'), input)
    return c.json(ProfessorOutput.parse(professor), 201)
  })

  /**
   * `restrictProfessorSelf` so autoriza (403 se professor editando registro
   * alheio). Qual schema Zod validar contra — completo (admin) ou restrito
   * (self) — e escolhido aqui, em runtime, porque `zValidator` amarra um
   * schema fixo na definicao da rota e essa rota precisa de dois.
   */
  .put('/:id', authMiddleware, restrictProfessorSelf, async (c) => {
    const usuario = c.get('usuario')
    const schema = usuario.papel === 'ADMIN' ? ProfessorUpdateInputAdmin : ProfessorUpdateInputSelf

    const json = await c.req.json().catch(() => ({}))
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      return c.json(validationErrorBody('json', parsed.error), 400)
    }

    const professor = await professoresService.atualizarProfessor(
      c.get('prisma'),
      c.req.param('id'),
      parsed.data,
    )
    return c.json(ProfessorOutput.parse(professor))
  })
