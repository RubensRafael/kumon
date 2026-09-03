import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

import type { ApiErrorResponse } from '../../shared/api'
import type { AppEnv } from '../types'

/**
 * Handler global de erros: garante que a API sempre responda JSON, inclusive
 * quando algo estoura dentro do Prisma.
 */
export const onError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse()
  }

  console.error('[api] erro nao tratado:', error)

  const body: ApiErrorResponse = {
    error: 'internal_server_error',
    message: error instanceof Error ? error.message : 'Erro interno inesperado.',
  }

  return c.json(body, 500)
}
