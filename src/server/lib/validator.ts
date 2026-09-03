import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

import type { ApiError } from '../../shared/dto'

/**
 * `zValidator` com resposta de erro padronizada.
 *
 * Sem o hook, uma falha de validacao devolve o dump bruto do zod, num formato
 * diferente de todos os outros erros da API. Aqui ela vira o mesmo `ApiError`
 * das demais respostas, com `issues` no formato "campo: mensagem" — que o
 * cliente usa para destacar o campo problematico no formulario.
 */
export function validate<TSchema extends ZodType, TTarget extends keyof ValidationTargets>(
  target: TTarget,
  schema: TSchema,
) {
  return zValidator(target, schema, (result, c) => {
    if (result.success) return

    const body: ApiError = {
      error: 'validation_error',
      message: `Os dados enviados em "${target}" sao invalidos.`,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }

    return c.json(body, 400)
  })
}
