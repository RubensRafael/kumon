import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'

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
 * `navigator.userAgent === 'Cloudflare-Workers'` e o jeito documentado pela
 * propria Cloudflare de detectar, em runtime, se o codigo esta rodando dentro
 * do workerd — tanto em producao quanto sob `wrangler dev` (que roda o
 * runtime de verdade, ao contrario do `npm run dev` via Vite, que executa o
 * mesmo modulo em Node puro).
 *
 * So o workerd bloqueia socket TCP cru; e por isso que so ali o adapter do
 * Neon (HTTP/WebSocket) e obrigatorio. Em qualquer outro caso — `npm run dev`
 * e os testes e2e do Vitest, ambos Node puro — o adapter do `pg` (TCP normal)
 * fala direto com o Postgres do `docker-compose.yml`.
 */
function isCloudflareWorkers(): boolean {
  const runtime = globalThis as { navigator?: { userAgent?: string } }
  return runtime.navigator?.userAgent === 'Cloudflare-Workers'
}

/**
 * Cria um PrismaClient por requisicao.
 *
 * No Prisma 7 nao ha mais `url` no datasource: a conexao chega exclusivamente
 * pelo Driver Adapter, sempre obrigatorio na instanciacao do client.
 * Instanciar o client nao abre conexao — isso so acontece na primeira query —,
 * e um Worker nao mantem estado confiavel entre invocacoes, entao um client
 * por request e o padrao correto na Edge. O pooling real fica com o pooler do
 * Neon (producao) ou com o Postgres local (dev/teste).
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = isCloudflareWorkers()
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString })

  return new PrismaClient({ adapter })
}
