const DIAS_SEMANA_BANCO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

/**
 * Dia da semana (enum do banco, MAIUSCULO) de uma data — usado por
 * `GET /registros?data=X` pra achar os `MatriculaHorario` daquele dia.
 * `getUTCDay()` (0=domingo..6=sabado) bate na mesma ordem do enum
 * `DiaSemana` do schema, porque o campo chega como `Date` ja ancorado em UTC
 * (`z.coerce.date()` em `registros.dto.ts`, ver "AAAA-MM-DD" sem hora/
 * timezone e sempre UTC por spec do JS).
 */
export function diaDaSemana(data: Date): (typeof DIAS_SEMANA_BANCO)[number] {
  return DIAS_SEMANA_BANCO[data.getUTCDay()]
}
