/** Minutos desde 00:00 de um horário `HH:MM` -- mesma conta de `painel.dto.ts`. */
export function minutosDoHorario(hhmm: string): number {
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

/**
 * `true` quando um horário de aula (`MatriculaHorario.horario`) cabe dentro
 * da janela de atendimento do professor -- início da aula não pode ser
 * antes de `horarioInicial` nem depois (ou igual) de `horarioFinal`, quando
 * a aula já não caberia.
 */
export function horarioDentroDaJanela(
  horario: string,
  horarioInicial: string,
  horarioFinal: string,
): boolean {
  const minutosHorario = minutosDoHorario(horario)
  return minutosHorario >= minutosDoHorario(horarioInicial) && minutosHorario < minutosDoHorario(horarioFinal)
}
