import { Hono } from 'hono'

import { validate } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/require-admin.middleware'
import { scopeToProfessor } from '../../middlewares/scope-to-professor.middleware'
import type { AppEnv } from '../../types'
import { AlunoCreateInput, AlunoOutput, AlunoUpdateInput } from '../../../shared/dto/alunos.dto'
import * as alunosService from './alunos.service'

export const alunosRoutes = new Hono<AppEnv>()
  .get('/', authMiddleware, scopeToProfessor, async (c) => {
    const alunos = await alunosService.listarAlunos(c.get('prisma'), c.get('escopoProfessorId'))
    return c.json(alunos.map((aluno) => AlunoOutput.parse(aluno)))
  })

  .get('/:id', authMiddleware, scopeToProfessor, async (c) => {
    const aluno = await alunosService.buscarAluno(
      c.get('prisma'),
      c.req.param('id'),
      c.get('escopoProfessorId'),
    )
    return c.json(AlunoOutput.parse(aluno))
  })

  .post('/', authMiddleware, requireAdmin, validate('json', AlunoCreateInput), async (c) => {
    const input = c.req.valid('json')
    const aluno = await alunosService.criarAluno(c.get('prisma'), input)
    return c.json(AlunoOutput.parse(aluno), 201)
  })

  // Admin-only mesmo pro professor "dono" do aluno — sem scopeToProfessor aqui.
  .put('/:id', authMiddleware, requireAdmin, validate('json', AlunoUpdateInput), async (c) => {
    const input = c.req.valid('json')
    const aluno = await alunosService.atualizarAluno(c.get('prisma'), c.req.param('id'), input)
    return c.json(AlunoOutput.parse(aluno))
  })
