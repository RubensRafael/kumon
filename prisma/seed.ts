import 'dotenv/config'

import { randomUUID } from 'node:crypto'

import { Client } from 'pg'

import { hashSenha } from '../src/server/lib/senha'

/**
 * Só pra dev local — nunca rodar contra um banco de produção. Existe pra não
 * depender do fluxo de reset de senha (`/auth/solicitar-reset`) só pra
 * conseguir logar localmente: este usuário nasce com senha já utilizável,
 * ao contrário de todo usuário criado por `POST /usuarios` (que nasce com
 * `SENHA_PLACEHOLDER`, sempre inválida até o primeiro reset).
 *
 * Usa `pg` direto (sem o Prisma Client gerado) de propósito: o client gerado
 * (`runtime = "cloudflare"`) carrega o Query Compiler via um import de WASM
 * module que só o Vite/Vitest sabem resolver (ver `vite-plugins/workerd-wasm-modules.ts`)
 * — um script standalone rodado com `tsx` não passa por esse pipeline. Uma
 * única inserção simples não justifica arrastar essa infraestrutura pra cá.
 */
const ADMIN_EMAIL = 'admin@kflow.local'
const ADMIN_SENHA = 'senha123'

async function main() {
  const databaseUrl = process.env.BACKEND_DATABASE_URL
  if (!databaseUrl) {
    throw new Error('BACKEND_DATABASE_URL nao definida -- confira o seu .env.')
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const existente = await client.query('SELECT 1 FROM "usuarios" WHERE "email" = $1', [ADMIN_EMAIL])
    if (existente.rowCount) {
      console.log(`Usuario admin de dev ja existe (${ADMIN_EMAIL}) -- nada a fazer.`)
      return
    }

    await client.query(
      `INSERT INTO "usuarios" ("id", "nome", "email", "senhaHash", "papel", "ativo", "criadoEm", "atualizadoEm")
       VALUES ($1, $2, $3, $4, 'ADMIN'::"Papel", true, now(), now())`,
      [randomUUID(), 'Admin (dev)', ADMIN_EMAIL, await hashSenha(ADMIN_SENHA)],
    )

    console.log(`Usuario admin de dev criado: ${ADMIN_EMAIL} / ${ADMIN_SENHA}`)
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
