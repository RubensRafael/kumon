import { z } from 'zod'

import { DiaSemanaEnum } from '../../../shared/dto/enums'

export const PainelOutput = z.object({
  totalAlunosAtivos: z.number().int(),
  totalMatriculasAtivas: z.number().int(),
  totalProfessores: z.number().int(),
  ocupacaoPercentual: z.number(),
  matriculasPorMateria: z.array(
    z.object({
      materiaId: z.uuid(),
      materiaNome: z.string(),
      total: z.number().int(),
    }),
  ),
  aulasPorDiaSemana: z.array(
    z.object({
      diaSemana: DiaSemanaEnum,
      total: z.number().int(),
    }),
  ),
  alertas: z.array(
    z.object({
      tipo: z.string(),
      alunoId: z.uuid().optional(),
      mensagem: z.string(),
    }),
  ),
})

export type PainelOutputType = z.infer<typeof PainelOutput>
