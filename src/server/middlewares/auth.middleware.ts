import { deleteCookie, getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { z } from 'zod'

import { PapelEnum } from '../../shared/dto/enums'
import type { AppEnv } from '../types'

/**
 * Nome do cookie de sessao. Front e back sao a mesma origem (Worker unico
 * servindo os assets da SPA e a API, ver `wrangler.jsonc`), entao um cookie
 * `HttpOnly` funciona sem CORS no caminho e sem o token nunca ficar
 * acessivel ao JS do front — `POST /auth/login` seta, `POST /auth/logout`
 * limpa.
 */
export const TOKEN_COOKIE_NAME = 'kflow_token'

const jwtPayloadSchema = z.object({
  sub: z.string(),
  papel: PapelEnum,
  professorId: z.string().nullable(),
})

/**
 * Le o JWT do cookie `kflow_token` e injeta o usuario em `c.var.usuario`.
 *
 * Revalida `ativo`/`papel` no banco a cada request: o token sozinho garante
 * só que foi emitido por nós e ainda não expirou, não que continua
 * refletindo o estado atual do usuário — `PUT /usuarios/:id` pode desativar
 * ou trocar o papel a qualquer momento, e sem essa consulta o token velho
 * continuaria validando por até 7 dias (a validade dele). `professorId`
 * continua vindo do token: não existe endpoint que altere esse vínculo após
 * a criação, então não há valor em rebuscá-lo aqui.
 *
 * Todo 401 daqui (token presente, mas inválido/expirado/de usuário
 * desativado) também limpa o cookie -- assim o browser para de reenviar um
 * token morto em toda request seguinte. Não se aplica ao caso de token
 * ausente (nada a limpar), nem aos 403 de autorização de
 * `require-admin.middleware.ts`/`restrict-professor-self.middleware.ts`, que
 * são sessão válida sem permissão, não sessão morta.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, TOKEN_COOKIE_NAME)

  if (!token) {
    throw new HTTPException(401, { message: 'Token de autenticacao ausente.' })
  }

  let payload: unknown
  try {
    payload = await verify(token, c.get('env').BACKEND_JWT_SECRET, 'HS256')
  } catch {
    deleteCookie(c, TOKEN_COOKIE_NAME, { path: '/' })
    throw new HTTPException(401, { message: 'Token invalido ou expirado.' })
  }

  const parsed = jwtPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    deleteCookie(c, TOKEN_COOKIE_NAME, { path: '/' })
    throw new HTTPException(401, { message: 'Token invalido ou expirado.' })
  }

  const usuario = await c.get('prisma').usuario.findUnique({
    where: { id: parsed.data.sub },
    select: { ativo: true, papel: true },
  })

  if (!usuario || !usuario.ativo) {
    deleteCookie(c, TOKEN_COOKIE_NAME, { path: '/' })
    throw new HTTPException(401, { message: 'Token invalido ou expirado.' })
  }

  c.set('usuario', {
    id: parsed.data.sub,
    papel: usuario.papel,
    professorId: parsed.data.professorId,
  })

  await next()
})
