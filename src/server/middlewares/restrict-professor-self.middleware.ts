import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

import type { AppEnv } from '../types'

/**
 * Usado so em `PUT /professores/:id`.
 *
 * - `admin` sempre passa.
 * - `professor` com `:id === usuario.professorId` passa (o handler decide,
 *   depois, validar contra o schema restrito — nao e responsabilidade deste
 *   middleware escolher schema, so autorizar).
 * - `professor` com `:id !== usuario.professorId` recebe `403`: e escrita em
 *   registro alheio, nao um caso de "some da lista" — aqui o erro explicito e
 *   o correto (ver `plan.md`, "Middlewares").
 */
export const restrictProfessorSelf = createMiddleware<AppEnv>(async (c, next) => {
  const usuario = c.get('usuario')

  if (usuario.papel === 'PROFESSOR' && c.req.param('id') !== usuario.professorId) {
    throw new HTTPException(403, { message: 'Voce so pode editar o proprio cadastro de professor.' })
  }

  await next()
})
