import { z } from 'zod'

import {
  AtividadeCasaEnum,
  AutonomiaEnum,
  BoletimEnum,
  ChegadaEnum,
  ComportamentoEnum,
  DesempenhoEnum,
  FocoEnum,
  HorarioDoDia,
} from '../../../shared/dto/enums'
import { VIRTUAL_REGISTRO_ID } from '../../../shared/dto/registro.dto'

/**
 * `data` como `Date`, nao string -- mesmo raciocinio de `alunos.dto.ts`:
 * `z.coerce.date()` no input valida sozinho (sem funcao de parse separada),
 * `z.date()` no output deixa `c.json()` serializar como ISO completo.
 */

/** Retornado por `GET /registros` (lista do dia) e reaproveitado dentro de `RegistroDetalheOutput`. */
export const RegistroResumoOutput = z.object({
  // VIRTUAL_REGISTRO_ID (nao uuid real) = ainda nao existe linha, e virtual. Ver o jsdoc la.
  id: z.union([z.uuid(), z.literal(VIRTUAL_REGISTRO_ID)]),
  horarioId: z.uuid(),
  matriculaId: z.uuid(),
  alunoId: z.uuid(),
  alunoNome: z.string(),
  professorId: z.uuid(),
  materiaId: z.uuid(),
  data: z.date(),
  horarioPrevisto: HorarioDoDia,
  // Sem "status" derivado no backend -- os campos abaixo bastam pra `isFalta`/
  // `isCompleto` (src/shared/dto/registro.dto.ts) calcularem isso no front.
  chegada: ChegadaEnum.nullable(),
  boletim: BoletimEnum.nullable(),
  atividadeCasa: AtividadeCasaEnum.nullable(),
  foco: FocoEnum.nullable(),
  autonomia: AutonomiaEnum.nullable(),
  comportamento: ComportamentoEnum.nullable(),
  desempenho: DesempenhoEnum.nullable(),
})

/** Retornado por `GET /registros/:id` e pelos endpoints de criacao/atualizacao. */
export const RegistroDetalheOutput = RegistroResumoOutput.extend({
  estagio: z.string().nullable(),
  conteudoIds: z.array(z.uuid()),
  anotacao: z.string().nullable(),
})

/**
 * Um unico formato de entrada, usado tanto na criacao (`POST`) quanto em
 * cada auto-save (`PUT`). Tudo opcional exceto o minimo pra criar a linha na
 * primeira chamada. Sem checagem de coerencia entre campos (ex.:
 * boletim/foco so fazem sentido se `chegada: 'PRESENTE'`) — a UI decide o
 * que mostrar; o backend so persiste o que chega.
 */
export const RegistroInput = z.object({
  horarioId: z.uuid(),
  data: z.coerce.date(),
  chegada: ChegadaEnum.optional(),
  boletim: BoletimEnum.optional(),
  atividadeCasa: AtividadeCasaEnum.optional(),
  foco: FocoEnum.optional(),
  autonomia: AutonomiaEnum.optional(),
  comportamento: ComportamentoEnum.optional(),
  desempenho: DesempenhoEnum.optional(),
  conteudoIds: z.array(z.uuid()).optional(),
  anotacao: z.string().optional(),
})

// PUT reaproveita o mesmo shape, sem horarioId/data (nao mudam depois de criado).
export const RegistroUpdateInput = RegistroInput.omit({ horarioId: true, data: true }).partial()

export const ListarRegistrosQuery = z.object({
  data: z.coerce.date(),
})

export type RegistroResumoOutputType = z.infer<typeof RegistroResumoOutput>
export type RegistroDetalheOutputType = z.infer<typeof RegistroDetalheOutput>
export type RegistroInputType = z.infer<typeof RegistroInput>
export type RegistroUpdateInputType = z.infer<typeof RegistroUpdateInput>
export type ListarRegistrosQueryType = z.infer<typeof ListarRegistrosQuery>
