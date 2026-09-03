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
 * No Prisma 7 nao ha mais `url` no datasource: a conexao chega exclusivamente
 * pelo Driver Adapter. Instanciar o client nao abre conexao — isso so acontece
 * na primeira query —, e um Worker nao mantem estado confiavel entre
 * invocacoes, entao um client por request e o padrao correto na Edge. O
 * pooling real fica com o pooler do Neon.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({ adapter })
}
