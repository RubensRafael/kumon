import { z } from 'zod'

import { SituacaoMatriculaEnum, TipoAtendimentoEnum } from '../../../shared/dto/enums'

export const MatriculaOutput = z.object({
  id: z.uuid(),
  alunoId: z.uuid(),
  professorId: z.uuid(),
  materiaId: z.uuid(),
  estagio: z.string().nullable(),
  tipoAtendimento: TipoAtendimentoEnum,
  situacao: SituacaoMatriculaEnum,
  observacoes: z.string().nullable(),
})

export const MatriculaCreateInput = z.object({
  professorId: z.uuid(),
  materiaId: z.uuid(),
  estagio: z.string().optional(),
  tipoAtendimento: TipoAtendimentoEnum,
  observacoes: z.string().optional(),
})

// professorId e materiaId nao existem neste schema de proposito — trocar
// qualquer um dos dois numa matricula existente e bloqueado por
// `rejeitarTrocaProfessorMateria`, com uma mensagem explicando o caminho
// certo (ver matriculas.middleware.ts).
export const MatriculaUpdateInput = z
  .object({
    estagio: z.string().optional(),
    tipoAtendimento: TipoAtendimentoEnum.optional(),
    situacao: SituacaoMatriculaEnum.optional(),
    observacoes: z.string().optional(),
  })
  .partial()

export type MatriculaOutputType = z.infer<typeof MatriculaOutput>
export type MatriculaCreateInputType = z.infer<typeof MatriculaCreateInput>
export type MatriculaUpdateInputType = z.infer<typeof MatriculaUpdateInput>
