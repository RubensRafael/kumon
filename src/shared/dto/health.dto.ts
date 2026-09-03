import { z } from 'zod'

export const databaseHealthSchema = z.object({
  connected: z.boolean(),
  /** Tempo do `SELECT 1` no Neon, em milissegundos. */
  latencyMs: z.number().nullable(),
  error: z.string().nullable(),
})

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  runtime: z.literal('cloudflare-workers'),
  environment: z.enum(['development', 'production']),
  timestamp: z.iso.datetime(),
  database: databaseHealthSchema,
})

export type DatabaseHealth = z.infer<typeof databaseHealthSchema>
export type HealthResponse = z.infer<typeof healthResponseSchema>
