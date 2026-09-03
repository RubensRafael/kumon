import { z } from 'zod'

/**
 * Enums compartilhados entre features — a forma que trafega pela API.
 *
 * O banco guarda cada um como enum nativo do Postgres, sempre em MAIUSCULO
 * (ver `prisma/schema.prisma`). Aqui a API expoe a mesma coisa em minusculo.
 * `src/server/lib/db-enum.ts` faz essa conversao num unico lugar.
 */

export const PapelEnum = z.enum(['admin', 'professor'])
export type Papel = z.infer<typeof PapelEnum>

export const DiaSemanaEnum = z.enum(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'])
export type DiaSemana = z.infer<typeof DiaSemanaEnum>

export const SituacaoAlunoEnum = z.enum(['ativo', 'trancado', 'desistente'])
export type SituacaoAluno = z.infer<typeof SituacaoAlunoEnum>

export const TipoAtendimentoEnum = z.enum(['regular', 'pre_escolar'])
export type TipoAtendimento = z.infer<typeof TipoAtendimentoEnum>

export const SituacaoMatriculaEnum = z.enum(['ativa', 'pausada', 'encerrada'])
export type SituacaoMatricula = z.infer<typeof SituacaoMatriculaEnum>

/** `status` e sempre derivado no backend — nunca aparece em nenhum input. */
export const StatusRegistroEnum = z.enum(['nao_iniciado', 'em_andamento', 'concluido'])
export type StatusRegistro = z.infer<typeof StatusRegistroEnum>

export const ChegadaEnum = z.enum(['presente', 'atrasado', 'faltou'])
export type Chegada = z.infer<typeof ChegadaEnum>

export const BoletimEnum = z.enum(['pegou', 'nao_pegou', 'problema'])
export type Boletim = z.infer<typeof BoletimEnum>

export const AtividadeCasaEnum = z.enum(['fez', 'fez_parcialmente', 'nao_fez', 'nao_havia'])
export type AtividadeCasa = z.infer<typeof AtividadeCasaEnum>

export const FocoEnum = z.enum(['baixo', 'regular', 'bom', 'excelente'])
export type Foco = z.infer<typeof FocoEnum>

export const AutonomiaEnum = z.enum(['baixa', 'regular', 'boa', 'excelente'])
export type Autonomia = z.infer<typeof AutonomiaEnum>

export const ComportamentoEnum = z.enum(['necessitou_intervencao', 'oscilou', 'adequado', 'excelente'])
export type Comportamento = z.infer<typeof ComportamentoEnum>

export const DesempenhoEnum = z.enum([
  'precisou_intervencao',
  'apresentou_dificuldade',
  'bom',
  'excelente',
])
export type Desempenho = z.infer<typeof DesempenhoEnum>
