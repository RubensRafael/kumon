import { Info } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'

import type { AgendaSlotOutputType, OcupacaoCelula } from '@shared/dto'

import { TIPO_ATENDIMENTO_LABEL } from './aluno-form/enum-labels'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

export interface ScheduleGridColumn {
  key: string
  header: ReactNode
}

/**
 * Verde claro → amarelo claro → vermelho claro conforme a célula se
 * aproxima (ou passa) da capacidade do professor -- interpolação contínua
 * de matiz (hue), não faixas fixas, pra dar a sensação de gradiente pedida.
 * `undefined` quando não há o que colorir (célula vazia ou professor sem
 * capacidade cadastrada) -- mantém o fundo padrão da tabela.
 */
function estiloOcupacao(ocupacao: OcupacaoCelula): CSSProperties | undefined {
  const total = ocupacao.ocupantes.length + ocupacao.overflow.length
  if (total === 0 || ocupacao.capacidade <= 0) return undefined

  const razao = Math.min(1, total / ocupacao.capacidade)
  const hue = razao <= 0.5 ? 142 - (142 - 48) * (razao / 0.5) : 48 - 48 * ((razao - 0.5) / 0.5)
  return { backgroundColor: `hsl(${hue} 70% 92%)` }
}

/** Lista read-only exibida no modal de detalhe da célula (ícone ⓘ no hover). */
function ListaOcupacaoCelula({ ocupacao }: { ocupacao: OcupacaoCelula }) {
  if (ocupacao.ocupantes.length === 0 && ocupacao.overflow.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum aluno nesse horário.</p>
  }

  return (
    <div className="space-y-3 text-sm">
      {ocupacao.ocupantes.length > 0 ? (
        <ul className="space-y-1.5">
          {ocupacao.ocupantes.map((slot) => (
            <li key={slot.horarioId} className="flex items-center justify-between gap-2">
              <span className="font-medium">{slot.alunoNome}</span>
              <span className="text-xs text-muted-foreground">{TIPO_ATENDIMENTO_LABEL[slot.tipoAtendimento]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nenhum aluno começando nesse horário.</p>
      )}

      {ocupacao.overflow.length > 0 ? (
        <div className="space-y-1.5 border-t border-dashed pt-3">
          <p className="text-xs text-muted-foreground">
            Ainda em sala (aula anterior de 50min, ainda não terminou):
          </p>
          <ul className="space-y-1.5">
            {ocupacao.overflow.map((slot) => (
              <li key={slot.horarioId} className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">{slot.alunoNome}</span>
                <span className="text-xs">desde {slot.horario}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Grade horário×coluna reaproveitada pela Agenda Geral (colunas =
 * professores) e pela Agenda individual (colunas = dias da semana
 * selecionada) — quem chama decide o que cada coluna representa e como
 * localizar os slots de uma célula.
 */
export function ScheduleGrid({
  colunas,
  horarios,
  slotsDaCelula,
  ocupacaoDaCelula,
  onSlotClick,
}: {
  colunas: ScheduleGridColumn[]
  horarios: string[]
  slotsDaCelula: (colunaKey: string, horario: string) => AgendaSlotOutputType[]
  /**
   * Ocupação "real" da célula (não filtrada pelos toggles da Agenda, ao
   * contrário de `slotsDaCelula`) -- inclui o spillover de `REGULAR` do
   * horário anterior. Base da cor de fundo; sempre a mesma independente de
   * filtro ativo, pra não sugerir que a capacidade do professor mudou só
   * porque a view está filtrada.
   */
  ocupacaoDaCelula: (colunaKey: string, horario: string) => OcupacaoCelula
  onSlotClick: (slot: AgendaSlotOutputType) => void
}) {
  const [celulaInfo, setCelulaInfo] = useState<{ coluna: ScheduleGridColumn; horario: string } | null>(null)

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="sticky left-0 z-10 min-w-20 bg-muted/50 px-3 py-2 text-left font-medium">
              Horário
            </th>
            {colunas.map((coluna) => (
              <th key={coluna.key} className="min-w-40 border-l px-3 py-2 text-left font-medium">
                {coluna.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horarios.map((horario) => (
            <tr key={horario} className="border-t">
              <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium text-muted-foreground">
                {horario}
              </td>
              {colunas.map((coluna) => {
                const slots = slotsDaCelula(coluna.key, horario)
                const ocupacao = ocupacaoDaCelula(coluna.key, horario)
                const temOcupacao = ocupacao.ocupantes.length + ocupacao.overflow.length > 0
                return (
                  <td
                    key={coluna.key}
                    className="group relative border-l px-2 py-1 align-top"
                    style={estiloOcupacao(ocupacao)}
                  >
                    {temOcupacao ? (
                      <button
                        type="button"
                        onClick={() => setCelulaInfo({ coluna, horario })}
                        className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground"
                        title="Ver detalhes da ocupação"
                      >
                        <Info className="size-3.5" />
                      </button>
                    ) : null}
                    <div className="flex flex-col gap-1">
                      {slots.length === 0 ? (
                        <span className="block px-1 text-muted-foreground">—</span>
                      ) : (
                        slots.map((slot) => (
                          <button
                            key={slot.horarioId}
                            type="button"
                            onClick={() => onSlotClick(slot)}
                            className="truncate rounded-md px-2 py-1 text-left text-xs font-medium text-white"
                            style={{ backgroundColor: slot.professorCorAgenda }}
                            title={`${slot.alunoNome} — ${slot.professorNome}`}
                          >
                            {slot.alunoNome}
                          </button>
                        ))
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={celulaInfo !== null} onOpenChange={(open) => !open && setCelulaInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocupação às {celulaInfo?.horario}</DialogTitle>
          </DialogHeader>
          {celulaInfo ? <ListaOcupacaoCelula ocupacao={ocupacaoDaCelula(celulaInfo.coluna.key, celulaInfo.horario)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
