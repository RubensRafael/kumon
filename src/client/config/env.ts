import type { FrontendEnv } from '../../shared/env'

/**
 * Variaveis de ambiente do front-end.
 *
 * Sao validadas pelo plugin `validateEnv` do `vite.config.ts`, que roda em dev
 * e no build — antes que qualquer valor chegue aqui. Por isso este modulo nao
 * importa zod: o schema fica fora do bundle e o browser recebe apenas os
 * valores, ja substituidos estaticamente pelo Vite.
 *
 * `envPrefix: 'FRONTEND_'` garante que nenhuma variavel `BACKEND_*` seja
 * embutida no bundle, mesmo estando no mesmo `.env`.
 */
export const clientEnv: FrontendEnv = {
  FRONTEND_API_BASE_URL: import.meta.env.FRONTEND_API_BASE_URL,
  FRONTEND_APP_NAME: import.meta.env.FRONTEND_APP_NAME,
}

export const isDev = import.meta.env.DEV
