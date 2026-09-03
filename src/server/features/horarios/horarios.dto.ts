import { z } from 'zod'

import { DiaSemanaEnum } from '../../../shared/dto/enums'

export const HorarioOutput = z.object({
  id: z.uuid(),
  matriculaId: z.uuid(),
  diaSemana: DiaSemanaEnum,
  horario: z.string(),
  ativo: z.boolean(),
})

export const HorarioCreateInput = z.object({
  diaSemana: DiaSemanaEnum,
  horario: z.string(),
})

// diaSemana/horario nao existem neste schema — so `ativo` e editavel numa
// linha existente. Se vierem no corpo mesmo assim, o Zod os descarta em
// silencio (ao contrario da matricula, aqui a spec nao pede erro explicito).
export const HorarioUpdateInput = z
  .object({
    ativo: z.boolean().optional(),
  })
  .partial()

export type HorarioOutputType = z.infer<typeof HorarioOutput>
export type HorarioCreateInputType = z.infer<typeof HorarioCreateInput>
export type HorarioUpdateInputType = z.infer<typeof HorarioUpdateInput>
