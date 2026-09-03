import { Hono } from 'hono'

import type { ListUsersResponse, UserDTO } from '../../shared/api'
import type { AppEnv } from '../types'

export const usersRoute = new Hono<AppEnv>()

/**
 * GET /api/users
 *
 * Exemplo de leitura com Prisma na Edge. Rode `npm run db:push` antes para
 * criar as tabelas do schema no Neon.
 */
usersRoute.get('/', async (c) => {
  const users = await c.get('prisma').user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const body: ListUsersResponse = {
    data: users.map(toUserDTO),
    count: users.length,
  }

  return c.json(body)
})

type UserRecord = { id: string; email: string; name: string | null; createdAt: Date }

function toUserDTO(user: UserRecord): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  }
}
