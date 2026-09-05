import { Hono } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'

import { validate } from '../../lib/validator'
import { TOKEN_COOKIE_NAME, authMiddleware } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/require-admin.middleware'
import type { AppEnv } from '../../types'
import {
  LoginInput,
  ResetarSenhaInput,
  SolicitarResetInput,
  UsuarioCreateInput,
  UsuarioOutput,
  UsuarioUpdateInput,
} from '../../../shared/dto/auth.dto'
import * as authService from './auth.service'

/** `/auth/*` — publico, nunca passa por `authMiddleware`. */
export const authRoutes = new Hono<AppEnv>()
  .post('/login', validate('json', LoginInput), async (c) => {
    const input = c.req.valid('json')
    const { token, usuario } = await authService.autenticar(
      c.get('prisma'),
      c.get('env').BACKEND_JWT_SECRET,
      input,
    )

    setCookie(c, TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      // `Secure` exige HTTPS — em dev local (`npm run dev`, http://localhost)
      // o browser descartaria o cookie silenciosamente se isso fosse sempre true.
      secure: c.get('env').BACKEND_ENVIRONMENT === 'production',
      sameSite: 'Strict',
      path: '/',
      maxAge: authService.SETE_DIAS_EM_SEGUNDOS,
    })

    return c.json({ usuario })
  })

  .post('/logout', async (c) => {
    deleteCookie(c, TOKEN_COOKIE_NAME, { path: '/' })
    return c.body(null, 204)
  })

  .post('/solicitar-reset', validate('json', SolicitarResetInput), async (c) => {
    const input = c.req.valid('json')
    await authService.solicitarReset(
      c.get('prisma'),
      input,
      c.get('env').BACKEND_ENVIRONMENT,
      c.get('env').BACKEND_RESEND_API_KEY,
      new URL(c.req.url).origin,
    )
    return c.body(null, 204)
  })

  .post('/resetar-senha', validate('json', ResetarSenhaInput), async (c) => {
    const input = c.req.valid('json')
    await authService.resetarSenha(c.get('prisma'), input)
    return c.body(null, 204)
  })

/** `GET /me` — qualquer usuario autenticado. */
export const meRoute = new Hono<AppEnv>().get('/', authMiddleware, async (c) => {
  const usuario = await authService.usuarioAtual(c.get('prisma'), c.get('usuario').id)
  return c.json(UsuarioOutput.parse(usuario))
})

/** `/usuarios/*` — sempre admin. */
export const usuariosRoutes = new Hono<AppEnv>()
  .get('/', authMiddleware, requireAdmin, async (c) => {
    const usuarios = await authService.listarUsuarios(c.get('prisma'))
    return c.json(usuarios.map((usuario) => UsuarioOutput.parse(usuario)))
  })

  .post(
    '/',
    authMiddleware,
    requireAdmin,
    validate('json', UsuarioCreateInput),
    async (c) => {
      const input = c.req.valid('json')
      const usuario = await authService.criarUsuario(c.get('prisma'), input)
      return c.json(UsuarioOutput.parse(usuario), 201)
    },
  )

  .put(
    '/:id',
    authMiddleware,
    requireAdmin,
    validate('json', UsuarioUpdateInput),
    async (c) => {
      const input = c.req.valid('json')
      const usuario = await authService.atualizarUsuario(c.get('prisma'), c.req.param('id'), input)
      return c.json(UsuarioOutput.parse(usuario))
    },
  )
