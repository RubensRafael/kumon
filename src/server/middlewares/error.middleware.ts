import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

import type { ApiError } from '../../shared/dto'
import { EnvValidationError } from '../../shared/env'
import type { AppEnv } from '../types'

/**
 * Handler global de erros: garante que a API sempre responda JSON, com uma
 * forma unica (`ApiError`) que o cliente sabe interpretar.
 */
export const onError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof ZodError) {
    const body: ApiError = {
      error: 'validation_error',
      message: 'Os dados enviados sao invalidos.',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }
    return c.json(body, 400)
  }

  if (error instanceof EnvValidationError) {
    console.error('[api]', error.message)
    const body: ApiError = {
      error: 'configuration_error',
      message: error.message,
    }
    return c.json(body, 500)
  }

  if (error instanceof HTTPException) {
    const body: ApiError = {
      error: 'http_error',
      message: error.message,
    }
    return c.json(body, error.status)
  }

  console.error('[api] erro nao tratado:', error)

  const body: ApiError = {
    error: 'internal_server_error',
    message: error instanceof Error ? error.message : 'Erro interno inesperado.',
  }

  return c.json(body, 500)
}
