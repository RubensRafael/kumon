import { Hono } from 'hono'

import { validate } from '../../lib/validator'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/require-admin.middleware'
import type { AppEnv } from '../../types'
import {
  LoginInput,
  ResetarSenhaInput,
  SolicitarResetInput,
  UsuarioCreateInput,
  UsuarioOutput,
  UsuarioUpdateInput,
} from './auth.dto'
import * as authService from './auth.service'

/** `/auth/*` — publico, nunca passa por `authMiddleware`. */
export const authRoutes = new Hono<AppEnv>()
  .post('/login', validate('json', LoginInput), async (c) => {
    const input = c.req.valid('json')
    const resultado = await authService.autenticar(
      c.get('prisma'),
      c.get('env').BACKEND_JWT_SECRET,
      input,
    )
    return c.json(resultado)
  })

  .post('/solicitar-reset', validate('json', SolicitarResetInput), async (c) => {
    const input = c.req.valid('json')
    await authService.solicitarReset(c.get('prisma'), input, c.get('env').BACKEND_ENVIRONMENT)
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
