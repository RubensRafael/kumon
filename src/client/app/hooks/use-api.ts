import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  type ApiEndpointName,
  type ApiRequestArgs,
  type ApiResponse,
  apiEndpoints,
} from '../../../shared/api/contract'
import type { ApiError as ApiErrorBody } from '../../../shared/dto'
import { clientEnv } from '../../config/env'

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

const MENSAGEM_ERRO_GENERICA = 'Não foi possível concluir a ação. Tente novamente.'

/**
 * Garante `ApiError` pros consumidores dos hooks abaixo -- inclusive quando
 * a falha nunca chegou a virar resposta HTTP (rede caiu, `fetch` rejeitou
 * antes de qualquer status), caso em que `callApi` nunca teria lançado uma
 * `ApiError` de verdade. Sem isso, todo consumidor precisaria de `instanceof
 * ApiError` só pra decidir se `.status`/`.code`/`.issueFor()` existem.
 */
function paraApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const mensagem = error instanceof Error && error.message.trim() ? error.message : MENSAGEM_ERRO_GENERICA
  return new ApiError(0, 'network_error', mensagem)
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
 * Prisma. Privado deste módulo de propósito -- nenhuma tela deve chamá-lo
 * direto, só pelos 3 hooks abaixo (`useApiQuery`, `useApiMutation`,
 * `useApiLazyQuery`), que normalizam erro e (nas mutações) avisam o usuário
 * sozinhos.
 */
async function callApi<TName extends ApiEndpointName>(
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

type QueryState<TName extends ApiEndpointName> =
  | { status: 'idle'; data: undefined; error: null }
  // `data` aceita o valor anterior de propósito -- só fica populado quando
  // `keepPreviousData` está ligado (ver abaixo); nos demais casos quem seta
  // o estado sempre manda `undefined` aqui, então o tipo externo de `data`
  // (`ApiResponse<TName> | undefined`) não muda pra ninguém.
  | { status: 'loading'; data: ApiResponse<TName> | undefined; error: null }
  | { status: 'success'; data: ApiResponse<TName>; error: null }
  | { status: 'error'; data: undefined; error: ApiError }

/**
 * Busca automática e genérica sobre `callApi` — sem cache, sem invalidação
 * automática. Refaz a chamada quando `name`/`args` mudam (comparados por
 * `JSON.stringify`, suficiente pros argumentos simples que a API recebe) ou
 * quando `refetch()` é chamado à mão, tipicamente depois de uma
 * `useApiMutation` bem-sucedida na mesma tela.
 *
 * `keepPreviousData` (padrão `false`, preserva o comportamento de sempre):
 * mantém `data` da rodada anterior visível enquanto um `refetch()` está em
 * voo, em vez de zerar pra `undefined` -- sem isso, uma tela que gate seu
 * render inteiro em `!data` desmonta e perde qualquer estado local (ex.: um
 * modal aberto) toda vez que chama `refetch()` depois de uma mutação, só pra
 * mostrar exatamente os mesmos dados um instante depois.
 */
export function useApiQuery<TName extends ApiEndpointName>(
  name: TName,
  args: ApiRequestArgs<TName>,
  options: { enabled?: boolean; keepPreviousData?: boolean } = {},
) {
  const { enabled = true, keepPreviousData = false } = options
  const [state, setState] = useState<QueryState<TName>>({ status: 'loading', data: undefined, error: null })
  const argsKey = JSON.stringify(args)

  const refetch = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled) return
      setState((atual) => ({
        status: 'loading',
        data: keepPreviousData ? atual.data : undefined,
        error: null,
      }))
      try {
        const data = await callApi(name, { ...args, signal } as ApiRequestArgs<TName> & { signal?: AbortSignal })
        setState({ status: 'success', data, error: null })
      } catch (error) {
        if (signal?.aborted) return
        setState({ status: 'error', data: undefined, error: paraApiError(error) })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- argsKey representa `args` de forma estavel
    [name, argsKey, enabled, keepPreviousData],
  )

  useEffect(() => {
    const controller = new AbortController()
    void refetch(controller.signal)
    return () => controller.abort()
  }, [refetch])

  return {
    data: state.data,
    error: state.error,
    loading: state.status === 'loading',
    refetch: () => refetch(),
  }
}

/**
 * Mutação manual e genérica sobre `callApi` — sem invalidação automática de
 * cache (não há cache). Quem chama `mutate` decide o que fazer depois: em
 * geral, chamar `refetch()` da `useApiQuery` correspondente.
 *
 * Toda falha dispara um `toast.error` automaticamente — nenhum chamador
 * precisa ler `error`/`try-catch` só para o usuário ficar sabendo que a
 * escrita falhou. Passe `{ silent: true }` para telas que já mostram o erro
 * de outra forma (inline) e não querem o toast em cima.
 */
export function useApiMutation<TName extends ApiEndpointName>(
  name: TName,
  options: { silent?: boolean } = {},
) {
  const { silent = false } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = useCallback(
    async (args: ApiRequestArgs<TName>): Promise<ApiResponse<TName>> => {
      setLoading(true)
      setError(null)
      try {
        const data = await callApi(name, args as ApiRequestArgs<TName> & { signal?: AbortSignal })
        return data
      } catch (err) {
        const normalized = paraApiError(err)
        setError(normalized)
        if (!silent) toast.error(normalized.message)
        throw normalized
      } finally {
        setLoading(false)
      }
    },
    [name, silent],
  )

  return { mutate, loading, error }
}

/**
 * Query manual: mesmo formato de estado que `useApiQuery`, mas disparada por
 * `execute()` em vez de sozinha no mount ou em reação a `args` mudando.
 * Existe pra leituras que precisam de controle explícito de quando rodar
 * (ex.: o `GET /me` do `AuthProvider`, uma vez, fora de qualquer dependência
 * reativa) sem reimplementar uma chamada a `callApi` -- que continua
 * privado deste módulo.
 */
export function useApiLazyQuery<TName extends ApiEndpointName>(name: TName) {
  const [state, setState] = useState<QueryState<TName>>({ status: 'idle', data: undefined, error: null })

  const execute = useCallback(
    async (args: ApiRequestArgs<TName>): Promise<ApiResponse<TName>> => {
      setState({ status: 'loading', data: undefined, error: null })
      try {
        const data = await callApi(name, args as ApiRequestArgs<TName> & { signal?: AbortSignal })
        setState({ status: 'success', data, error: null })
        return data
      } catch (err) {
        const normalized = paraApiError(err)
        setState({ status: 'error', data: undefined, error: normalized })
        throw normalized
      }
    },
    [name],
  )

  return { data: state.data, error: state.error, loading: state.status === 'loading', execute }
}
