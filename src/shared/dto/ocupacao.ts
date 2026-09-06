import type { TipoAtendimento } from './enums'

/** Mesmo grid de 30min que `HorarioDoDia` forca em todo `MatriculaHorario.horario`. */
export const DURACAO_SLOT_MIN = 30

/** Duracao real de uma aula, por `tipoAtendimento` da matricula -- nao do professor. */
export const DURACAO_AULA_MIN: Record<TipoAtendimento, number> = {
  REGULAR: 50,
  PRE_ESCOLAR: 30,
}

export function minutosDoHorario(hhmm: string): number {
  const [horas, minutos] = hhmm.split(':').map(Number)
  return (horas ?? 0) * 60 + (minutos ?? 0)
}

export function horarioDosMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Quantos slots de `DURACAO_SLOT_MIN` uma aula desse `tipoAtendimento`
 * ocupa, arredondado pra cima. `REGULAR` (50min) ocupa 2 -- o proprio
 * horario mais um "spillover" informativo no slot seguinte. `PRE_ESCOLAR`
 * (30min) ocupa exatamente 1.
 */
export function slotsOcupados(tipoAtendimento: TipoAtendimento): number {
  return Math.ceil(DURACAO_AULA_MIN[tipoAtendimento] / DURACAO_SLOT_MIN)
}

/**
 * Horarios do grid de 30min ocupados por uma aula que comeca em
 * `horarioInicio`, dado seu `tipoAtendimento` -- ex.: `REGULAR` as 14:00
 * devolve `['14:00', '14:30']` (o proprio horario + spillover). Unica fonte
 * dessa regra de duracao: reusada tanto pela ocupacao agregada do Painel
 * (`calcularAgregacoesPainel`) quanto pelo calculo por celula da Agenda
 * (`calcularOcupacaoCelula`), pra elas nunca divergirem sobre quanto tempo
 * uma aula realmente ocupa.
 */
export function horariosOcupados(horarioInicio: string, tipoAtendimento: TipoAtendimento): string[] {
  const slots = slotsOcupados(tipoAtendimento)
  const inicioMin = minutosDoHorario(horarioInicio)
  return Array.from({ length: slots }, (_, i) => horarioDosMinutos(inicioMin + i * DURACAO_SLOT_MIN))
}
