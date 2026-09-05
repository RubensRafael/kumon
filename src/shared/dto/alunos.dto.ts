import { z } from 'zod'

import { SituacaoAlunoEnum } from './enums'

/**
 * Datas como `Date`, nao string: `z.coerce.date()` no input aceita
 * "AAAA-MM-DD" (ou qualquer ISO) e ja valida/rejeita data invalida sozinho
 * (mesmo caminho de erro 400 de qualquer outra falha de validacao, sem
 * precisar de uma funcao de parse separada) -- "AAAA-MM-DD" sem hora e sem
 * timezone e sempre UTC por spec do JS, entao nao ha ambiguidade a resolver
 * na mao. No output, `z.date()` deixa o `Date` do Prisma passar direto; a
 * serializacao de `c.json()` (via `Date.prototype.toJSON`) ja devolve ISO
 * completo pro cliente.
 */
export const AlunoOutput = z.object({
  id: z.uuid(),
  nome: z.string(),
  responsavel: z.string().nullable(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.email().nullable(),
  dataNascimento: z.date().nullable(),
  observacoes: z.string().nullable(),
  dataMatricula: z.date(),
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
  dataNascimento: z.coerce.date().optional(),
  observacoes: z.string().optional(),
  dataMatricula: z.coerce.date(),
  situacao: SituacaoAlunoEnum.default('ATIVO'),
  zonaVermelha: z.boolean().default(false),
  connect: z.boolean().default(false),
})

export const AlunoUpdateInput = AlunoCreateInput.partial()

export type AlunoOutputType = z.infer<typeof AlunoOutput>
export type AlunoCreateInputType = z.infer<typeof AlunoCreateInput>
export type AlunoUpdateInputType = z.infer<typeof AlunoUpdateInput>
