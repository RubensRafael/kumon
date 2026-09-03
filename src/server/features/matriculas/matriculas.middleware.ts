import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

import type { AppEnv } from '../../types'

const MENSAGEM =
  'Nao e possivel trocar o professor ou a materia de uma matricula existente por aqui. ' +
  'Encerre esta matricula (situacao: "encerrada") e crie uma nova para o aluno com o ' +
  'professor/materia correto.'

/**
 * So em `PUT /matriculas/:id`. `MatriculaUpdateInput` nem declara
 * `professorId`/`materiaId` — o Zod ja os descartaria em silencio —, mas a
 * spec pede um `422` explicito com essa mensagem especifica: e regra de
 * integridade do dado (a matricula tem `MATRICULA_HORARIO`/`REGISTRO_AULA`
 * dependurados, e trocar o professor/materia por baixo deles corromperia
 * esse historico), nao uma questao de permissao — vale pra admin tambem.
 * `c.req.json()` e seguro de chamar de novo no handler: o Hono cacheia o
 * corpo parseado, entao nao ha problema de stream ja consumido.
 */
export const rejeitarTrocaProfessorMateria = createMiddleware<AppEnv>(async (c, next) => {
  const corpo: unknown = await c.req.json().catch(() => ({}))

  if (typeof corpo === 'object' && corpo !== null && ('professorId' in corpo || 'materiaId' in corpo)) {
    throw new HTTPException(422, { message: MENSAGEM })
  }

  await next()
})
