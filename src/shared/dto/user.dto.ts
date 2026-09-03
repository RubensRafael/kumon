import { z } from 'zod'

/**
 * DTO do usuario — a forma que trafega pela API.
 *
 * Deliberadamente escrito a mao, e nao derivado do modelo do Prisma: o
 * front-end nunca enxerga o schema do banco, e uma coluna nova (ou renomeada)
 * nao vaza para o contrato publico sem alguem decidir por isso.
 */
export const userDtoSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  createdAt: z.iso.datetime(),
})

export const createUserInputSchema = z.object({
  email: z.email('e-mail invalido'),
  name: z.string().min(2, 'minimo de 2 caracteres').max(80).nullish(),
})

export const listUsersQuerySchema = z.object({
  /** `coerce` porque query string sempre chega como texto. */
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(80).optional(),
})

export const listUsersResponseSchema = z.object({
  data: z.array(userDtoSchema),
  count: z.number().int().nonnegative(),
})

export type UserDto = z.infer<typeof userDtoSchema>
export type CreateUserInput = z.input<typeof createUserInputSchema>
export type ListUsersQuery = z.input<typeof listUsersQuerySchema>
export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>
