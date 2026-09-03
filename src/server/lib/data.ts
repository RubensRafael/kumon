import { HTTPException } from 'hono/http-exception'

/**
 * "AAAA-MM-DD" -> `Date` (meia-noite UTC). A spec declara esses campos como
 * `z.string()` puro (sem formato), o que deixaria uma data invalida estourar
 * como erro cru do Prisma/Postgres em vez de um `400` legivel — aqui essa
 * checagem vira uma mensagem amigavel antes de tocar o banco.
 */
export function parseData(valor: string, campo: string): Date {
  const data = new Date(`${valor}T00:00:00.000Z`)
  if (Number.isNaN(data.getTime())) {
    throw new HTTPException(400, { message: `${campo} nao e uma data valida (esperado AAAA-MM-DD).` })
  }
  return data
}

/** `Date` -> "AAAA-MM-DD", pro lado da API. */
export function formatarData(data: Date): string {
  return data.toISOString().slice(0, 10)
}

const DIAS_SEMANA_BANCO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

/**
 * Dia da semana (enum do banco, MAIUSCULO) de uma data — usado por
 * `GET /registros?data=X` pra achar os `MatriculaHorario` daquele dia.
 * `getUTCDay()` (0=domingo..6=sabado) bate na mesma ordem do enum
 * `DiaSemana` do schema, porque `parseData` sempre ancora em UTC.
 */
export function diaDaSemana(data: Date): (typeof DIAS_SEMANA_BANCO)[number] {
  return DIAS_SEMANA_BANCO[data.getUTCDay()]
}
