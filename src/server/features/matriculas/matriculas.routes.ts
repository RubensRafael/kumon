import { Hono } from 'hono'

import { validate } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/require-admin.middleware'
import { scopeToProfessor } from '../../middlewares/scope-to-professor.middleware'
import type { AppEnv } from '../../types'
import { MatriculaCreateInput, MatriculaOutput, MatriculaUpdateInput } from './matriculas.dto'
import * as matriculasService from './matriculas.service'

/** Montada em `/alunos` — convive com `alunosRoutes` (patterns nao colidem: `/:id` vs `/:alunoId/matriculas`). */
export const alunoMatriculasRoutes = new Hono<AppEnv>()
  .get('/:alunoId/matriculas', authMiddleware, scopeToProfessor, async (c) => {
    const matriculas = await matriculasService.listarMatriculasDoAluno(
      c.get('prisma'),
      c.req.param('alunoId'),
      c.get('escopoProfessorId'),
    )
    return c.json(matriculas.map((matricula) => MatriculaOutput.parse(matricula)))
  })

  .post(
    '/:alunoId/matriculas',
    authMiddleware,
    requireAdmin,
    validate('json', MatriculaCreateInput),
    async (c) => {
      const input = c.req.valid('json')
      const matricula = await matriculasService.criarMatricula(
        c.get('prisma'),
        c.req.param('alunoId'),
        input,
      )
      return c.json(MatriculaOutput.parse(matricula), 201)
    },
  )

/** Montada em `/matriculas`. */
export const matriculasRoutes = new Hono<AppEnv>().put(
  '/:id',
  authMiddleware,
  requireAdmin,
  validate('json', MatriculaUpdateInput),
  async (c) => {
    const input = c.req.valid('json')
    const matricula = await matriculasService.atualizarMatricula(c.get('prisma'), c.req.param('id'), input)
    return c.json(MatriculaOutput.parse(matricula))
  },
)
