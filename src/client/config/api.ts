import {
  type ApiEndpointName,
  type ApiRequestArgs,
  type ApiResponse,
  apiEndpoints,
} from '../../shared/api/contract'
import type { ApiError as ApiErrorBody } from '../../shared/dto'
import { clientEnv } from './env'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: NonNullable<ApiErrorBody['issues']> = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** Mensagem de validacao de um campo especifico, para exibir no formulario. */
  issueFor(field: string): string | undefined {
    return this.issues.find((issue) => issue.path === field)?.message
  }
}

type CallOptions<TName extends ApiEndpointName> = ApiRequestArgs<TName> & {
  signal?: AbortSignal
}

/**
 * Cliente da API dirigido pelo contrato de `src/shared/api/contract.ts`.
 *
 * O nome da rota determina metodo, path, query, corpo e tipo de retorno — tudo
 * inferido, nada repetido aqui. Chamar `callApi('createUser', { query: ... })`
 * ou esquecer o `body` nao compila.
 *
 * Nada do servidor e importado: o cliente conhece o contrato, nao o Hono nem o
 * Prisma.
 */
export async function callApi<TName extends ApiEndpointName>(
  name: TName,
  options: CallOptions<TName>,
): Promise<ApiResponse<TName>> {
  const endpoint = apiEndpoints[name]
  let path: string = endpoint.path
  for (const [key, value] of Object.entries(options.params ?? {})) {
    path = path.replace(`:${key}`, encodeURIComponent(String(value)))
  }

  const url = new URL(`${clientEnv.FRONTEND_API_BASE_URL}${path}`, window.location.origin)

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    method: endpoint.method,
    signal: options.signal,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = payload as ApiErrorBody | null

    // Sessao expirada/invalida em qualquer chamada, nao so `GET /me` -- o
    // `AuthProvider` escuta este evento pra zerar o usuario, o que faz o
    // `RequireAuth` redirecionar pra `/login` no proximo render, mesmo
    // quando o 401 veio de uma chamada no meio de outra tela.
    if (response.status === 401) {
      window.dispatchEvent(new Event('kflow:unauthorized'))
    }

    throw new ApiError(
      response.status,
      error?.error ?? 'unknown_error',
      error?.message ?? `A chamada "${name}" falhou com status ${response.status}.`,
      error?.issues ?? [],
    )
  }

  return payload as ApiResponse<TName>
}
