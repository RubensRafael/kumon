import 'dotenv/config'

import { defineConfig } from 'prisma/config'

/**
 * Configuracao do Prisma CLI (migrate, db push, studio, introspect).
 *
 * A partir do Prisma 7 a connection string sai do `schema.prisma` e vem para
 * ca. Este arquivo roda em Node — nunca no Worker —, entao le a variavel
 * direto de `process.env`, alimentado pelo `dotenv` a partir do `.env`.
 *
 * Em runtime quem fornece a conexao e o Driver Adapter passado ao
 * `new PrismaClient({ adapter })`; veja `src/server/db/client.ts`.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.BACKEND_DATABASE_URL,
  },
})
