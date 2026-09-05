import { createContext, useContext, type ReactNode } from 'react'

import type { PainelDadosOutputType } from '../../../shared/dto'
import { type ApiError, useApiQuery } from './use-api'

interface PainelSnapshotContextValue {
  dados: PainelDadosOutputType | undefined
  loading: boolean
  error: ApiError | null
  refetch: () => void
}

const PainelSnapshotContext = createContext<PainelSnapshotContextValue | null>(null)

/**
 * Snapshot bruto da unidade (`GET /painel`: professores/alunos/matérias/
 * matrículas) buscado uma única vez e compartilhado por qualquer tela que
 * precise cruzar essas dimensões (Painel, Agenda, formulário de Alunos...) —
 * em vez de cada uma refazer a mesma chamada e duplicar a lógica de
 * derivação. Cada consumidor deriva e filtra seu próprio estado a partir de
 * `dados`, sem chamada extra.
 */
export function PainelSnapshotProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refetch } = useApiQuery('obterPainel', {})

  return (
    <PainelSnapshotContext.Provider value={{ dados: data, loading, error, refetch }}>
      {children}
    </PainelSnapshotContext.Provider>
  )
}

export function usePainelSnapshot() {
  const ctx = useContext(PainelSnapshotContext)
  if (!ctx) throw new Error('usePainelSnapshot precisa estar dentro de <PainelSnapshotProvider>.')
  return ctx
}
