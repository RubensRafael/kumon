import { Hono } from 'hono'

import { validate } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { scopeToProfessor } from '../../middlewares/scope-to-professor.middleware'
import type { AppEnv } from '../../types'
import {
  ListarRegistrosQuery,
  RegistroDetalheOutput,
  RegistroInput,
  RegistroResumoOutput,
  RegistroUpdateInput,
} from '../../../shared/dto/registros.dto'
import * as registrosService from './registros.service'

/**
 * Nenhuma rota aqui usa `requireAdmin`: e "admin ou professor dono", e a
 * checagem de dono depende do recurso (o `horarioId` no `POST`, o registro
 * existente no `PUT`) — fica em cada chamada de service, a partir do mesmo
 * `escopoProfessorId` que `scopeToProfessor` ja calcula.
 */
export const registrosRoutes = new Hono<AppEnv>()
  .get('/', authMiddleware, scopeToProfessor, validate('query', ListarRegistrosQuery), async (c) => {
    const { data } = c.req.valid('query')
    const registros = await registrosService.listarRegistrosDoDia(
      c.get('prisma'),
      data,
      c.get('escopoProfessorId'),
    )
    return c.json(registros.map((registro) => RegistroResumoOutput.parse(registro)))
  })

  .get('/:id', authMiddleware, scopeToProfessor, async (c) => {
    const registro = await registrosService.buscarRegistroDetalhe(
      c.get('prisma'),
      c.req.param('id'),
      c.get('escopoProfessorId'),
    )
    return c.json(RegistroDetalheOutput.parse(registro))
  })

  .post('/', authMiddleware, scopeToProfessor, validate('json', RegistroInput), async (c) => {
    const input = c.req.valid('json')
    const registro = await registrosService.criarRegistro(
      c.get('prisma'),
      input,
      c.get('escopoProfessorId'),
    )
    return c.json(RegistroDetalheOutput.parse(registro), 201)
  })

  .put('/:id', authMiddleware, scopeToProfessor, validate('json', RegistroUpdateInput), async (c) => {
    const input = c.req.valid('json')
    const registro = await registrosService.atualizarRegistro(
      c.get('prisma'),
      c.req.param('id'),
      input,
      c.get('escopoProfessorId'),
    )
    return c.json(RegistroDetalheOutput.parse(registro))
  })
