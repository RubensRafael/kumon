import { useCallback, useEffect, useState } from 'react'

import type { ApiResponse } from '../../../shared/api/contract'
import type { CreateUserInput } from '../../../shared/dto'
import { ApiError, callApi } from '../../config/api'

/**
 * Lista e cria usuarios.
 *
 * `createUser` devolve os `issues` de validacao quando o servidor rejeita a
 * entrada, para o formulario destacar o campo exato — sao os mesmos schemas
 * zod que o cliente conhece pelo contrato.
 */
export function useUsers(limit = 20) {
  const [users, setUsers] = useState<ApiResponse<'listUsers'>['data']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      try {
        const result = await callApi('listUsers', { query: { limit }, signal })
        setUsers(result.data)
        setError(null)
      } catch (caught) {
        if (signal?.aborted) return
        setError(caught instanceof Error ? caught.message : 'Falha ao listar usuarios.')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [limit],
  )

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  const createUser = useCallback(
    async (input: CreateUserInput): Promise<ApiError | null> => {
      try {
        await callApi('createUser', { body: input })
        await refresh()
        return null
      } catch (caught) {
        if (caught instanceof ApiError) return caught
        throw caught
      }
    },
    [refresh],
  )

  return { users, loading, error, refresh: () => void refresh(), createUser }
}
