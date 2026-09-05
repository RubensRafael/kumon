import { useCallback, useEffect, useState } from 'react'

import type { ApiEndpointName, ApiRequestArgs, ApiResponse } from '../../../shared/api/contract'
import { callApi } from '../../config/api'

type State<TName extends ApiEndpointName> =
  | { status: 'loading'; data: undefined; error: null }
  | { status: 'success'; data: ApiResponse<TName>; error: null }
  | { status: 'error'; data: undefined; error: Error }

/**
 * Busca manual e genérica sobre `callApi` — sem cache, sem invalidação
 * automática. Refaz a chamada quando `name`/`args` mudam (comparados por
 * `JSON.stringify`, suficiente pros argumentos simples que a API recebe) ou
 * quando `refetch()` é chamado à mão, tipicamente depois de uma
 * `useApiMutation` bem-sucedida na mesma tela.
 */
export function useApiQuery<TName extends ApiEndpointName>(
  name: TName,
  args: ApiRequestArgs<TName>,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options
  const [state, setState] = useState<State<TName>>({ status: 'loading', data: undefined, error: null })
  const argsKey = JSON.stringify(args)

  const refetch = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled) return
      setState({ status: 'loading', data: undefined, error: null })
      try {
        const data = await callApi(name, { ...args, signal } as ApiRequestArgs<TName> & { signal?: AbortSignal })
        setState({ status: 'success', data, error: null })
      } catch (error) {
        if (signal?.aborted) return
        setState({
          status: 'error',
          data: undefined,
          error: error instanceof Error ? error : new Error('Falha desconhecida.'),
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- argsKey representa `args` de forma estavel
    [name, argsKey, enabled],
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
