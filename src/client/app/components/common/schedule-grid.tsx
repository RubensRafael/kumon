import type { CSSProperties, ReactNode } from 'react'

import type { AgendaSlotOutputType, OcupacaoCelula } from '@shared/dto'

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
                return (
                  <td
                    key={coluna.key}
                    className="border-l px-2 py-1 align-top"
                    style={estiloOcupacao(ocupacao)}
                  >
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
    </div>
  )
}
