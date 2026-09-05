import type { ReactNode } from 'react'

import type { AgendaSlotOutputType } from '@shared/dto'

export interface ScheduleGridColumn {
  key: string
  header: ReactNode
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
  onSlotClick,
}: {
  colunas: ScheduleGridColumn[]
  horarios: string[]
  slotsDaCelula: (colunaKey: string, horario: string) => AgendaSlotOutputType[]
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
                return (
                  <td key={coluna.key} className="border-l px-2 py-1 align-top">
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
