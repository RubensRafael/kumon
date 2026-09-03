import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

import type { ApiError } from '../../shared/dto'

/** O unico formato de `ZodError` que `validationErrorBody` realmente usa. */
interface ZodErrorLike {
  issues: { path: PropertyKey[]; message: string }[]
}

/**
 * Formata um `ZodError` no `ApiError` padrao da API, com `issues` no formato
 * "campo: mensagem".
 *
 * Extraido do hook do `zValidator` para ser reaproveitado tambem por rotas
 * que nao conseguem usar um schema fixo por rota — ex.: `PUT /professores/:id`,
 * que escolhe o schema (admin vs. self) em runtime a partir de quem esta
 * autenticado, algo que o `zValidator` (schema decidido na definicao da rota)
 * nao suporta.
 *
 * Tipado estruturalmente (`ZodErrorLike`), e nao como `ZodError` de `zod`: o
 * `result.error` que o `@hono/zod-validator` devolve nao e nominalmente o
 * mesmo tipo exportado por `zod` nesta versao, so estruturalmente compativel.
 */
export function validationErrorBody(target: string, error: ZodErrorLike): ApiError {
  return {
    error: 'validation_error',
    message: `Os dados enviados em "${target}" sao invalidos.`,
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  }
}

/**
 * `zValidator` com resposta de erro padronizada.
 *
 * Sem o hook, uma falha de validacao devolve o dump bruto do zod, num formato
 * diferente de todos os outros erros da API. Aqui ela vira o mesmo `ApiError`
 * das demais respostas.
 */
export function validate<TSchema extends ZodType, TTarget extends keyof ValidationTargets>(
  target: TTarget,
  schema: TSchema,
) {
  return zValidator(target, schema, (result, c) => {
    if (result.success) return
    return c.json(validationErrorBody(target, result.error), 400)
  })
}
