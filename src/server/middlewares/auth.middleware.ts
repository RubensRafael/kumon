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
 * Revalida `ativo`/`papel` no banco a cada request: o token sozinho garante
 * só que foi emitido por nós e ainda não expirou, não que continua
 * refletindo o estado atual do usuário — `PUT /usuarios/:id` pode desativar
 * ou trocar o papel a qualquer momento, e sem essa consulta o token velho
 * continuaria validando por até 7 dias (a validade dele). `professorId`
 * continua vindo do token: não existe endpoint que altere esse vínculo após
 * a criação, então não há valor em rebuscá-lo aqui.
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

  const usuario = await c.get('prisma').usuario.findUnique({
    where: { id: parsed.data.sub },
    select: { ativo: true, papel: true },
  })

  if (!usuario || !usuario.ativo) {
    throw new HTTPException(401, { message: 'Token invalido ou expirado.' })
  }

  c.set('usuario', {
    id: parsed.data.sub,
    papel: usuario.papel,
    professorId: parsed.data.professorId,
  })

  await next()
})
