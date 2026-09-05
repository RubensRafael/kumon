import { useCallback, useState } from 'react'

import type { ApiEndpointName, ApiRequestArgs, ApiResponse } from '../../../shared/api/contract'
import { callApi } from '../../config/api'

/**
 * Mutação manual e genérica sobre `callApi` — sem invalidação automática de
 * cache (não há cache). Quem chama `mutate` decide o que fazer depois: em
 * geral, chamar `refetch()` da `useApiQuery` correspondente.
 */
export function useApiMutation<TName extends ApiEndpointName>(name: TName) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(
    async (args: ApiRequestArgs<TName>): Promise<ApiResponse<TName>> => {
      setLoading(true)
      setError(null)
      try {
        const data = await callApi(name, args as ApiRequestArgs<TName> & { signal?: AbortSignal })
        return data
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error('Falha desconhecida.')
        setError(normalized)
        throw normalized
      } finally {
        setLoading(false)
      }
    },
    [name],
  )

  return { mutate, loading, error }
}
