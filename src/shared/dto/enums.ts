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
