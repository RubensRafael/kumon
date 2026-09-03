import { createMiddleware } from 'hono/factory'

import { type BackendEnv, backendEnvSchema, parseEnv } from '../../shared/env'
import type { AppEnv } from '../types'

/**
 * Valida as variaveis `BACKEND_*` e injeta a versao tipada em `c.var.env`.
 *
 * Um Worker nao tem "boot": o codigo de modulo roda antes de existir qualquer
 * `env`, entao a validacao acontece no primeiro request de cada isolate e o
 * resultado fica em cache para os seguintes. Isso vale tanto para o `vite dev`
 * quanto para o Worker publicado — a mesma checagem, no mesmo ponto.
 *
 * Se faltar variavel, a resposta e um 500 explicito dizendo qual, em vez de um
 * erro obscuro vindo do driver do banco.
 */
let cached: BackendEnv | null = null

export const envMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  cached ??= parseEnv(backendEnvSchema, c.env, 'backend')
  c.set('env', cached)
  await next()
})
