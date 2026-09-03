import { z } from 'zod'

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  /** Presente quando a falha veio da validacao de entrada. */
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>
