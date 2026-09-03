import type { PrismaClient } from './db/generated/client'

/**
 * Bindings do Worker.
 *
 * `Env` e gerado por `npm run cf-typegen` (wrangler types) a partir do
 * wrangler.jsonc e ja contem o binding `ASSETS`. `DATABASE_URL` nao aparece la
 * porque e um secret: vem do `.dev.vars` em desenvolvimento e de
 * `wrangler secret put` / dashboard em producao.
 */
export interface Bindings extends Env {
  DATABASE_URL: string
}

/** Valores injetados no contexto por middlewares (`c.get(...)`). */
export interface Variables {
  prisma: PrismaClient
}

export interface AppEnv {
  Bindings: Bindings
  Variables: Variables
}
