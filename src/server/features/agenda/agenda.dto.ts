import { z } from 'zod'

import { DiaSemanaEnum } from '../../../shared/dto/enums'

export const AgendaSlotOutput = z.object({
  horarioId: z.uuid(),
  diaSemana: DiaSemanaEnum,
  horario: z.string(),
  matriculaId: z.uuid(),
  alunoId: z.uuid(),
  alunoNome: z.string(),
  professorId: z.uuid(),
  professorNome: z.string(),
  materiaId: z.uuid(),
})

export const ListarAgendaQuery = z.object({
  professorId: z.uuid().optional(),
})

export type AgendaSlotOutputType = z.infer<typeof AgendaSlotOutput>
export type ListarAgendaQueryType = z.infer<typeof ListarAgendaQuery>
