import { useCallback, useEffect, useState } from 'react'

import type { ApiResponse } from '../../../shared/api/contract'
import { ApiError, callApi } from '../../config/api'

type State =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: ApiResponse<'health'>; error: null }
  | { status: 'error'; data: null; error: string }

/** Consome `GET /api/health` — o handshake entre a SPA e o Worker. */
export function useHealth() {
  const [state, setState] = useState<State>({ status: 'loading', data: null, error: null })

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setState({ status: 'loading', data: null, error: null })

    try {
      // `data` ja chega como HealthResponse: o tipo vem do contrato.
      const data = await callApi('health', { signal })
      setState({ status: 'success', data, error: null })
    } catch (error) {
      if (signal?.aborted) return
      setState({
        status: 'error',
        data: null,
        error: error instanceof ApiError || error instanceof Error ? error.message : 'Falha desconhecida.',
      })
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  return { ...state, refresh: () => void refresh() }
}
