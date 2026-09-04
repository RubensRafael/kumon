import { z } from 'zod'

/**
 * Enums compartilhados entre features — a forma que trafega pela API.
 *
 * Mesmo casing do enum nativo do Postgres (MAIUSCULO, ver
 * `prisma/schema.prisma`) — decisao revista: o `plan.md` original sugeria
 * minusculo na API com uma camada de conversao (`paraApi`/`paraBanco`), mas
 * o valor real disso era baixo (as duas pontas ja sao fixadas pelo mesmo
 * schema) e ter um so casing elimina a conversao e os call sites com generic
 * explicito que ela exigia.
 */

export const PapelEnum = z.enum(['ADMIN', 'PROFESSOR'])
export type Papel = z.infer<typeof PapelEnum>

export const DiaSemanaEnum = z.enum(['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'])
export type DiaSemana = z.infer<typeof DiaSemanaEnum>

export const SituacaoAlunoEnum = z.enum(['ATIVO', 'TRANCADO', 'DESISTENTE'])
export type SituacaoAluno = z.infer<typeof SituacaoAlunoEnum>

export const TipoAtendimentoEnum = z.enum(['REGULAR', 'PRE_ESCOLAR'])
export type TipoAtendimento = z.infer<typeof TipoAtendimentoEnum>

export const SituacaoMatriculaEnum = z.enum(['ATIVA', 'PAUSADA', 'ENCERRADA'])
export type SituacaoMatricula = z.infer<typeof SituacaoMatriculaEnum>

/**
 * "HH:mm" em intervalos de 30 min -- ex.: "07:00", "14:30", "23:30".
 *
 * O regex tem duas partes, uma pra hora e uma pra minuto, separadas pelo `:`:
 * - Hora: `[01]\d` cobre "00" a "19" (0 ou 1, seguido de qualquer dígito),
 *   `2[0-3]` cobre "20" a "23" -- juntos, toda hora válida de um dia.
 * - Minuto: `(00|30)` só aceita esses dois literais, nada mais.
 * `^`/`$` garantem que a string inteira precisa bater, não só um pedaço dela.
 */
export const HORARIO_REGEX = /^([01]\d|2[0-3]):(00|30)$/
export const HorarioDoDia = z
  .string()
  .regex(HORARIO_REGEX, 'Horario deve estar no formato HH:mm, em intervalos de 30 minutos (ex.: "14:00", "14:30").')
export type HorarioDoDiaType = z.infer<typeof HorarioDoDia>
