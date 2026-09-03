import type { BackendEnv } from '../shared/env'
import type { PrismaClient } from './db/generated/client'

/**
 * Bindings do Worker.
 *
 * Declarados a mao, e nao herdando o `Env` de `worker-configuration.d.ts`,
 * para que os tipos das rotas nao dependam dos globais do workerd — e o que
 * permite ao contrato compartilhado ser consumido pelo front-end sem arrastar
 * o runtime da Cloudflare junto.
 *
 * As variaveis `BACKEND_*` sao injetadas pelo Wrangler a partir do `.env` em
 * desenvolvimento e dos secrets da Cloudflare em producao.
 */
export interface Bindings extends Record<string, unknown> {
  BACKEND_DATABASE_URL: string
  BACKEND_ENVIRONMENT: string
  BACKEND_JWT_SECRET: string
  /** Binding dos assets estaticos declarado no wrangler.jsonc. */
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> }
}

/**
 * Usuario autenticado, decodificado do JWT por `authMiddleware`.
 *
 * `professorId` vem preenchido quando `papel === 'professor'` — e o vinculo
 * que `scopeToProfessor` usa para filtrar dados de outros professores.
 */
export interface AuthContext {
  id: string
  papel: 'admin' | 'professor'
  professorId: string | null
}

/** Valores injetados no contexto por middlewares (`c.get(...)`). */
export interface Variables {
  /** `c.env` ja validado e tipado pelo `envMiddleware`. */
  env: BackendEnv
  prisma: PrismaClient
  /** Presente apos `authMiddleware`; ausente em rotas publicas. */
  usuario: AuthContext
  /**
   * Presente apos `scopeToProfessor`. `null` = sem filtro (admin);
   * caso contrario, o `professorId` a que a query deve se restringir.
   */
  escopoProfessorId: string | null
}

export interface AppEnv {
  Bindings: Bindings
  Variables: Variables
}
