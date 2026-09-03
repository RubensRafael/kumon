import { createApp } from '../../src/server/app'
import { createPrismaClient } from '../../src/server/db/client'
import type { Bindings } from '../../src/server/types'

/**
 * Ambiente injetado em `app.request(path, init, env)` — o terceiro argumento
 * do metodo nativo de teste do Hono (https://hono.dev/docs/guides/testing),
 * que corresponde a `c.env` dentro dos handlers.
 *
 * Roda inteiramente em Node (nunca no workerd), entao `createPrismaClient`
 * seleciona o adapter do `pg` sozinho e fala TCP normal com o Postgres do
 * `docker-compose.yml` — nao ha nenhuma diferenca de setup entre local e CI
 * alem de garantir que o container esteja no ar (`npm run db:local:up`).
 */
export const testEnv: Bindings = {
  BACKEND_DATABASE_URL:
    process.env.BACKEND_DATABASE_URL ?? 'postgresql://kflow:kflow@localhost:54329/kflow',
  BACKEND_ENVIRONMENT: 'development',
  BACKEND_JWT_SECRET: 'segredo-de-teste-nao-usar-em-producao',
  // As rotas de API nunca alcancam o fallback da SPA nos testes e2e.
  ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
}

/** App Hono real, montado uma unica vez e reutilizado por todos os testes. */
export const app = createApp()

/** Prisma Client dos testes — usado pelos helpers de `resetDb` e pelas factories. */
export const prisma = createPrismaClient(testEnv.BACKEND_DATABASE_URL)

/**
 * Tabelas na ordem inversa de dependencia de FK, para o `TRUNCATE ... CASCADE`
 * limpar tudo de uma vez sem reclamar de constraint. `RESTART IDENTITY` nao e
 * estritamente necessario (todos os ids sao uuid), mas deixa o efeito
 * previsivel se algum dia entrar uma coluna serial.
 */
const TABLES = [
  'registro_aula_conteudo',
  'registros_aula',
  'matricula_horarios',
  'matriculas',
  'alunos',
  'professor_materia',
  'conteudos',
  'materias',
  'professores',
  'usuarios',
] as const

/** Limpa todas as tabelas do domínio. Chame no `beforeEach` de cada describe. */
export async function resetDb(): Promise<void> {
  const tables = TABLES.map((table) => `"${table}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
}
