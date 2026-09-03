import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types'

/**
 * Aplica-se a ALUNO, MATRICULA, MATRICULA_HORARIO, REGISTRO_AULA, AGENDA e
 * PAINEL (ver `plan.md`, "Middlewares"). Calcula o filtro de escopo e injeta
 * em `c.var.escopoProfessorId` — nunca a partir da querystring, sempre do
 * token:
 *
 * - `ADMIN` -> `null` (sem filtro).
 * - `PROFESSOR` -> `usuario.professorId`, sempre o proprio.
 *
 * De proposito nao decide *como* filtrar: cada feature tem uma forma
 * diferente de chegar no professor certo (coluna direta em `MATRICULA`,
 * `EXISTS` via relacao em `ALUNO`, join encadeado em `REGISTRO_AULA`/
 * `MATRICULA_HORARIO`) — essa parte fica em cada `*.service.ts`.
 */
export const scopeToProfessor = createMiddleware<AppEnv>(async (c, next) => {
  const usuario = c.get('usuario')
  c.set('escopoProfessorId', usuario.papel === 'PROFESSOR' ? usuario.professorId : null)
  await next()
})
