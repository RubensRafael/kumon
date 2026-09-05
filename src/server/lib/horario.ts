/** Minutos desde 00:00 de um horário `HH:MM` -- mesma conta de `painel.dto.ts`. */
function minutosDoHorario(hhmm: string): number {
  const [horas, minutos] = hhmm.split(':').map(Number)
  return (horas ?? 0) * 60 + (minutos ?? 0)
}

/**
 * `true` quando `horarioFinal` é estritamente depois de `horarioInicial` --
 * a única forma de janela de atendimento que faz sentido (`Professor` não
 * tem conceito de turno que atravessa a meia-noite).
 */
export function janelaDeAtendimentoValida(horarioInicial: string, horarioFinal: string): boolean {
  return minutosDoHorario(horarioFinal) > minutosDoHorario(horarioInicial)
}
