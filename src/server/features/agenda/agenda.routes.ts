import { Hono } from 'hono'

import { validate } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { scopeToProfessor } from '../../middlewares/scope-to-professor.middleware'
import type { AppEnv } from '../../types'
import { AgendaSlotOutput, ListarAgendaQuery } from './agenda.dto'
import * as agendaService from './agenda.service'

/** Montada em `/agenda`. */
export const agendaRoutes = new Hono<AppEnv>().get(
  '/',
  authMiddleware,
  scopeToProfessor,
  validate('query', ListarAgendaQuery),
  async (c) => {
    const { professorId } = c.req.valid('query')
    const agenda = await agendaService.listarAgenda(c.get('prisma'), professorId, c.get('escopoProfessorId'))
    return c.json(agenda.map((slot) => AgendaSlotOutput.parse(slot)))
  },
)

/** Montada em `/alunos` — convive com `alunosRoutes` e `alunoMatriculasRoutes` (padroes de rota nao colidem). */
export const alunoAgendaRoutes = new Hono<AppEnv>().get(
  '/:id/agenda',
  authMiddleware,
  scopeToProfessor,
  async (c) => {
    const agenda = await agendaService.listarAgendaDoAluno(
      c.get('prisma'),
      c.req.param('id'),
      c.get('escopoProfessorId'),
    )
    return c.json(agenda.map((slot) => AgendaSlotOutput.parse(slot)))
  },
)
