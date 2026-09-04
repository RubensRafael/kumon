import { Hono } from 'hono'

import { validate } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/require-admin.middleware'
import { scopeToProfessor } from '../../middlewares/scope-to-professor.middleware'
import type { AppEnv } from '../../types'
import { HorarioCreateInput, HorarioOutput, HorarioUpdateInput } from './horarios.dto'
import * as horariosService from './horarios.service'

/** Montada em `/matriculas` — convive com `matriculasRoutes` (PR 06), padroes de rota nao colidem. */
export const matriculaHorariosRoutes = new Hono<AppEnv>()
  .get('/:matriculaId/horarios', authMiddleware, scopeToProfessor, async (c) => {
    const horarios = await horariosService.listarHorariosDaMatricula(
      c.get('prisma'),
      c.req.param('matriculaId'),
      c.get('escopoProfessorId'),
    )
    return c.json(horarios.map((horario) => HorarioOutput.parse(horario)))
  })

  .post(
    '/:matriculaId/horarios',
    authMiddleware,
    requireAdmin,
    validate('json', HorarioCreateInput),
    async (c) => {
      const input = c.req.valid('json')
      const horario = await horariosService.criarHorario(
        c.get('prisma'),
        c.req.param('matriculaId'),
        input,
      )
      return c.json(HorarioOutput.parse(horario), 201)
    },
  )

/** Montada em `/horarios`. */
export const horariosRoutes = new Hono<AppEnv>().put(
  '/:id',
  authMiddleware,
  requireAdmin,
  validate('json', HorarioUpdateInput),
  async (c) => {
    const input = c.req.valid('json')
    const horario = await horariosService.atualizarHorario(c.get('prisma'), c.req.param('id'), input)
    return c.json(HorarioOutput.parse(horario))
  },
)
