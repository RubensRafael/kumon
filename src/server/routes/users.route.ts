import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import type { ApiResponse } from '../../shared/api/contract'
import { createUserInputSchema, listUsersQuerySchema, type UserDto } from '../../shared/dto'
import { validate } from '../lib/validator'
import type { AppEnv } from '../types'

/**
 * Rotas de usuario, com a entrada validada pelo `@hono/zod-validator`.
 *
 * O validator (`src/server/lib/validator.ts`) faz duas coisas: rejeita a
 * requisicao com 400 antes de encostar no banco e devolve, em `c.req.valid(...)`, o dado ja parseado e tipado — sem
 * cast manual e sem `any`. Os schemas sao os mesmos de `src/shared/dto`, entao
 * cliente e servidor validam contra a mesma definicao.
 */
export const usersRoute = new Hono<AppEnv>()
  .get('/', validate('query', listUsersQuerySchema), async (c) => {
    const { limit, search } = c.req.valid('query')

    const users = await c.get('prisma').user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const body: ApiResponse<'listUsers'> = {
      data: users.map(toUserDto),
      count: users.length,
    }

    return c.json(body)
  })

  .post('/', validate('json', createUserInputSchema), async (c) => {
    const input = c.req.valid('json')

    const existing = await c.get('prisma').user.findUnique({
      where: { email: input.email },
      select: { id: true },
    })

    if (existing) {
      throw new HTTPException(409, { message: `O e-mail ${input.email} ja esta cadastrado.` })
    }

    const user = await c.get('prisma').user.create({
      data: { email: input.email, name: input.name ?? null },
    })

    const body: ApiResponse<'createUser'> = toUserDto(user)

    return c.json(body, 201)
  })

/**
 * Converte o registro do banco no DTO publico.
 *
 * O parametro e tipado estruturalmente, e nao com o tipo do modelo do Prisma:
 * assim fica explicito que a API expoe um recorte escolhido a dedo, e uma
 * coluna nova nao vaza para o contrato sem alguem decidir por isso.
 */
function toUserDto(user: {
  id: string
  email: string
  name: string | null
  createdAt: Date
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  }
}
