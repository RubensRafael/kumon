import { z } from 'zod'

import { DiaSemanaEnum } from '../../../shared/dto/enums'

export const ProfessorOutput = z.object({
  id: z.uuid(),
  usuarioId: z.uuid().nullable(),
  nome: z.string(),
  telefone: z.string().nullable(),
  email: z.email().nullable(),
  photoUrl: z.url().nullable(),
  diasDisponiveis: z.array(DiaSemanaEnum),
  horarioInicial: z.string(),
  horarioFinal: z.string(),
  capacidadePorHorario: z.number().int(),
  duracaoAulaMin: z.number().int(),
  corAgenda: z.string(),
  observacoes: z.string().nullable(),
  materiaIds: z.array(z.uuid()),
})

export const ProfessorCreateInput = z.object({
  nome: z.string().min(1),
  telefone: z.string().optional(),
  email: z.email().optional(),
  photoUrl: z.url().optional(),
  diasDisponiveis: z.array(DiaSemanaEnum).min(1),
  horarioInicial: z.string(),
  horarioFinal: z.string(),
  capacidadePorHorario: z.number().int().positive(),
  duracaoAulaMin: z.number().int().positive(),
  corAgenda: z.string(),
  observacoes: z.string().optional(),
  materiaIds: z.array(z.uuid()).min(1),
})

export const ProfessorUpdateInputAdmin = ProfessorCreateInput.partial()

/**
 * Professor editando a si mesmo: o schema simplesmente nao declara os outros
 * campos. Se vierem no corpo (ex.: `capacidadePorHorario`), o Zod os
 * descarta silenciosamente — sem erro. A UI e quem garante, na pratica, que
 * esses campos nunca aparecam como editaveis pra esse papel.
 */
export const ProfessorUpdateInputSelf = z
  .object({
    telefone: z.string().optional(),
    email: z.email().optional(),
    photoUrl: z.url().optional(),
    observacoes: z.string().optional(),
  })
  .partial()

export type ProfessorOutputType = z.infer<typeof ProfessorOutput>
export type ProfessorCreateInputType = z.infer<typeof ProfessorCreateInput>
export type ProfessorUpdateInputAdminType = z.infer<typeof ProfessorUpdateInputAdmin>
export type ProfessorUpdateInputSelfType = z.infer<typeof ProfessorUpdateInputSelf>
