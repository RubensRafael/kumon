import { z } from 'zod'

import { SituacaoAlunoEnum } from '../../../shared/dto/enums'

export const AlunoOutput = z.object({
  id: z.uuid(),
  nome: z.string(),
  responsavel: z.string().nullable(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.email().nullable(),
  dataNascimento: z.string().nullable(),
  observacoes: z.string().nullable(),
  dataMatricula: z.string(),
  situacao: SituacaoAlunoEnum,
  zonaVermelha: z.boolean(),
  connect: z.boolean(),
})

export const AlunoCreateInput = z.object({
  nome: z.string().min(1),
  responsavel: z.string().optional(),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.email().optional(),
  dataNascimento: z.string().optional(),
  observacoes: z.string().optional(),
  dataMatricula: z.string(),
  situacao: SituacaoAlunoEnum.default('ATIVO'),
  zonaVermelha: z.boolean().default(false),
  connect: z.boolean().default(false),
})

export const AlunoUpdateInput = AlunoCreateInput.partial()

export type AlunoOutputType = z.infer<typeof AlunoOutput>
export type AlunoCreateInputType = z.infer<typeof AlunoCreateInput>
export type AlunoUpdateInputType = z.infer<typeof AlunoUpdateInput>
