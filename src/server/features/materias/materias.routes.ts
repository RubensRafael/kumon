import { Hono } from 'hono'

import { validate } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/require-admin.middleware'
import type { AppEnv } from '../../types'
import {
  ConteudoCreateInput,
  ConteudoOutput,
  ConteudoUpdateInput,
  ListarMateriasQuery,
  MateriaCreateInput,
  MateriaOutput,
  MateriaUpdateInput,
} from '../../../shared/dto/materias.dto'
import * as materiasService from './materias.service'

export const materiasRoutes = new Hono<AppEnv>()
  .get('/', authMiddleware, validate('query', ListarMateriasQuery), async (c) => {
    const { incluirInativas } = c.req.valid('query')
    const materias = await materiasService.listarMaterias(c.get('prisma'), incluirInativas === 'true')
    return c.json(materias.map((materia) => MateriaOutput.parse(materia)))
  })

  .post('/', authMiddleware, requireAdmin, validate('json', MateriaCreateInput), async (c) => {
    const input = c.req.valid('json')
    const materia = await materiasService.criarMateria(c.get('prisma'), input)
    return c.json(MateriaOutput.parse(materia), 201)
  })

  .put('/:id', authMiddleware, requireAdmin, validate('json', MateriaUpdateInput), async (c) => {
    const input = c.req.valid('json')
    const materia = await materiasService.atualizarMateria(c.get('prisma'), c.req.param('id'), input)
    return c.json(MateriaOutput.parse(materia))
  })

  .get('/:id/conteudos', authMiddleware, async (c) => {
    const conteudos = await materiasService.listarConteudosDaMateria(c.get('prisma'), c.req.param('id'))
    return c.json(conteudos.map((conteudo) => ConteudoOutput.parse(conteudo)))
  })

/** Montado separado, sob `/conteudos` — o unico endpoint desta feature fora de `/materias`. */
export const conteudosRoutes = new Hono<AppEnv>()
  .post('/', authMiddleware, requireAdmin, validate('json', ConteudoCreateInput), async (c) => {
    const input = c.req.valid('json')
    const conteudo = await materiasService.criarConteudo(c.get('prisma'), input)
    return c.json(ConteudoOutput.parse(conteudo), 201)
  })

  .put('/:id', authMiddleware, requireAdmin, validate('json', ConteudoUpdateInput), async (c) => {
    const input = c.req.valid('json')
    const conteudo = await materiasService.atualizarConteudo(c.get('prisma'), c.req.param('id'), input)
    return c.json(ConteudoOutput.parse(conteudo))
  })
