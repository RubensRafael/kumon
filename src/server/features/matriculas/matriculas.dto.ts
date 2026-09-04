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

// professorId e materiaId nao existem neste schema de proposito: trocar
// professor/materia de uma matricula existente nao e suportado por aqui
// (encerre e crie uma nova). O Zod descarta esses campos em silencio se
// vierem no corpo -- nao ha checagem explicita, a UI e quem deve impedir o
// envio.
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
