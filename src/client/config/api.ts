import type { ApiErrorResponse } from '../../shared/api'
import { clientEnv } from './env'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Cliente HTTP tipado da API do Hono.
 *
 * O tipo de retorno vem de `src/shared/api.ts`, o mesmo arquivo que o servidor
 * usa para montar a resposta — se o contrato mudar de um lado, o outro quebra
 * em tempo de compilacao.
 */
export async function apiFetch<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(`${clientEnv.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = payload as ApiErrorResponse | null
    throw new ApiError(
      response.status,
      error?.error ?? 'unknown_error',
      error?.message ?? `A requisicao para ${path} falhou com status ${response.status}.`,
    )
  }

  return payload as TResponse
}
