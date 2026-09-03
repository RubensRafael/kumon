import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

import { PrismaClient } from './generated/client'

/**
 * No workerd nao existe o modulo `ws` do Node. O driver do Neon aceita o
 * `WebSocket` nativo da Cloudflare, e `poolQueryViaFetch` faz as queries avulsas
 * (fora de transacao) trafegarem por HTTP/fetch — menos round-trips e sem
 * handshake de WebSocket no caminho quente.
 *
 * Transacoes interativas continuam usando WebSocket automaticamente.
 */
neonConfig.poolQueryViaFetch = true

if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket
}

/**
 * Cria um PrismaClient por requisicao.
 *
 * Um Worker nao mantem estado entre invocacoes de forma confiavel e a conexao
 * pertence ao ciclo de vida da requisicao, entao instanciar por request e o
 * padrao correto na Edge — o pooling real fica com o pooler do Neon.
 */
export function createPrismaClient(connectionString: string | undefined): PrismaClient {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL nao definida. Preencha o `.dev.vars` em desenvolvimento ou rode `wrangler secret put DATABASE_URL` para producao.',
    )
  }

  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({ adapter })
}
