import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import type { ApiEndpointName, ApiRequestArgs, ApiResponse } from '../../../shared/api/contract'
import { callApi } from '../../config/api'

const MENSAGEM_ERRO_GENERICA = 'Não foi possível concluir a ação. Tente novamente.'

/**
 * Mensagem exibida ao usuário para uma falha de mutação: a do backend
 * (`ApiError.message`) quando existir, senão um fallback genérico — nunca a
 * tela fica muda.
 */
function mensagemDeErro(error: Error): string {
  return error.message.trim().length > 0 ? error.message : MENSAGEM_ERRO_GENERICA
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
        if (!silent) toast.error(mensagemDeErro(normalized))
        throw normalized
      } finally {
        setLoading(false)
      }
    },
    [name, silent],
  )

  return { mutate, loading, error }
}
