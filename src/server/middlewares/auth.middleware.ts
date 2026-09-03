import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { z } from 'zod'

import { PapelEnum } from '../../shared/dto/enums'
import type { AppEnv } from '../types'

const jwtPayloadSchema = z.object({
  sub: z.string(),
  papel: PapelEnum,
  professorId: z.string().nullable(),
})

/**
 * Decodifica o JWT do header `Authorization: Bearer <token>` e injeta o
 * usuario em `c.var.usuario`.
 *
 * De proposito nao consulta o banco: confia no que o token carrega (ver
 * `auth.service.ts#autenticar`). Isso mantem o middleware barato — ele roda
 * em toda rota protegida —, ao custo de uma janela de ate 7 dias (a validade
 * do token) em que um usuario desativado (`ativo: false`) continua
 * autenticando com um token emitido antes da desativacao. `GET /me` busca o
 * estado atual no banco e nao sofre desse efeito.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null

  if (!token) {
    throw new HTTPException(401, { message: 'Token de autenticacao ausente.' })
  }

  let payload: unknown
  try {
    payload = await verify(token, c.get('env').BACKEND_JWT_SECRET, 'HS256')
  } catch {
    throw new HTTPException(401, { message: 'Token invalido ou expirado.' })
  }

  const parsed = jwtPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    throw new HTTPException(401, { message: 'Token invalido ou expirado.' })
  }

  c.set('usuario', {
    id: parsed.data.sub,
    papel: parsed.data.papel,
    professorId: parsed.data.professorId,
  })

  await next()
})
