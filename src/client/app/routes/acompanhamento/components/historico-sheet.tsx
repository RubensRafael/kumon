import { useState } from 'react'

import type { PeriodoHistorico } from '@shared/dto'

import { useApiQuery } from '../../../hooks/use-api-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../../components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs'

const PERIODOS: { valor: PeriodoHistorico; label: string }[] = [
  { valor: 'DIA', label: 'Dia' },
  { valor: 'SEMANA', label: 'Semana' },
  { valor: 'MES', label: 'Mês' },
  { valor: 'TUDO', label: 'Tudo' },
]

function Metrica({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground uppercase">{titulo}</p>
      <p className="text-lg font-semibold">{valor}</p>
    </div>
  )
}

function formatarNota(valor: number | null): string {
  return valor === null ? '—' : valor.toFixed(1)
}

function formatarEvolucao(valor: number | null): string {
  if (valor === null) return '—'
  if (valor === 0) return '±0.0'
  return valor > 0 ? `+${valor.toFixed(1)}` : valor.toFixed(1)
}

/**
 * Estatísticas agregadas por período — sem atraso em minutos (não existe no
 * schema) e sem "Feedback semana"/"Gerar" (feature de IA, issue #17). Ver
 * `docs/pr-fe-08-historico.md`.
 */
export function HistoricoSheet({
  open,
  onOpenChange,
  alunoId,
  alunoNome,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  alunoId: string | null
  alunoNome: string
}) {
  const [periodo, setPeriodo] = useState<PeriodoHistorico>('SEMANA')

  const { data, loading } = useApiQuery(
    'obterHistoricoAluno',
    { params: { alunoId: alunoId ?? '' }, query: { periodo } },
    { enabled: Boolean(alunoId) },
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {alunoNome} · Histórico de acompanhamento
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoHistorico)}>
            <TabsList>
              {PERIODOS.map((p) => (
                <TabsTrigger key={p.valor} value={p.valor}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading || !data ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Metrica titulo="Previstas" valor={String(data.previstas)} />
                <Metrica titulo="Realizadas" valor={String(data.realizadas)} />
                <Metrica titulo="Presença" valor={`${data.presencaPercentual}%`} />
                <Metrica
                  titulo="Tarefas feitas"
                  valor={data.tarefasFeitasPercentual === null ? '—' : `${data.tarefasFeitasPercentual}%`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metrica titulo="Foco" valor={formatarNota(data.mediaFoco)} />
                <Metrica titulo="Autonomia" valor={formatarNota(data.mediaAutonomia)} />
                <Metrica titulo="Comportamento" valor={formatarNota(data.mediaComportamento)} />
                <Metrica titulo="Desempenho" valor={formatarNota(data.mediaDesempenho)} />
              </div>

              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs text-muted-foreground uppercase">
                  Evolução (vs. período anterior)
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Foco</p>
                    <p className="font-medium">{formatarEvolucao(data.evolucao.foco)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Autonomia</p>
                    <p className="font-medium">{formatarEvolucao(data.evolucao.autonomia)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Comportamento</p>
                    <p className="font-medium">{formatarEvolucao(data.evolucao.comportamento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Desempenho</p>
                    <p className="font-medium">{formatarEvolucao(data.evolucao.desempenho)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
