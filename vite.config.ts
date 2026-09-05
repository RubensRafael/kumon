import { fileURLToPath } from 'node:url'

import devServer from '@hono/vite-dev-server'
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig, loadEnv } from 'vite'

import {
  FRONTEND_ENV_PREFIX,
  backendEnvSchema,
  frontendEnvSchema,
  parseEnv,
} from './src/shared/env.ts'
import { workerdWasmModules } from './vite-plugins/workerd-wasm-modules.ts'

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

/** Prefixo unico da API. Tudo fora dele pertence ao front-end. */
const API_PREFIX = '/api'

/**
 * `npm run dev` normalmente sobe um workerd de verdade (Miniflare) via
 * `cloudflareAdapter`, onde `navigator.userAgent === 'Cloudflare-Workers'`
 * forca `isCloudflareWorkers()` (`src/server/db/client.ts`) a escolher o
 * adapter do Neon — inalcancavel sem uma conta Neon, mesmo com
 * `BACKEND_DATABASE_URL` apontando pro Postgres local.
 *
 * Com `LOCAL_DEV_SERVER=true` no `.env`, o dev server roda em Node puro (sem
 * adapter): `isCloudflareWorkers()` retorna false naturalmente, o Prisma usa
 * `PrismaPg` contra o Postgres local, e `c.env` precisa vir de algum lugar —
 * daqui, das mesmas variaveis do `.env` (sem workerd, nao ha bindings do
 * `wrangler.jsonc`/`.dev.vars` para preencher `c.env` sozinho).
 *
 * Le com `loadEnv`, nao `process.env` puro, pra reaproveitar o `.env` que
 * cada um ja mantem localmente — sem arquivo de config duplicado nem comando
 * novo. Precisa acontecer aqui, na montagem dos `plugins` (Node normal, antes
 * do Worker existir): dentro do workerd, sockets TCP crus sao bloqueados pelo
 * proprio runtime, entao uma env lida so dentro do `isCloudflareWorkers()`
 * trocaria o driver do Prisma sem trocar o runtime, e a chamada quebraria do
 * mesmo jeito, com outro erro.
 */
const localEnv = loadEnv('development', process.cwd(), '')
const useLocalDevServer = localEnv.LOCAL_DEV_SERVER === 'true'

/**
 * Em dev o Vite e o unico servidor: ele entrega o `index.html`, os modulos do
 * React e o HMR, e delega ao Hono somente as requisicoes de `/api/*`.
 *
 * O regex abaixo e um negative lookahead: qualquer path que NAO comece com
 * `/api/` entra na lista de exclusao do dev-server e, portanto, jamais e
 * interceptado pelo Hono — e o que impede o servidor de "roubar" os assets
 * estaticos, o `/@vite/client`, os source maps e o websocket de HMR.
 */
const HONO_EXCLUDE = [new RegExp(`^(?!${API_PREFIX}/).*`)]

/**
 * Valida as variaveis de ambiente antes de qualquer coisa subir.
 *
 * Roda no `configResolved`, que dispara tanto no `vite dev` quanto no
 * `vite build` — entao um `.env` incompleto derruba o processo na hora, com a
 * lista do que falta, em vez de virar `undefined` no browser ou um erro
 * obscuro em producao.
 *
 * As `FRONTEND_*` sao sempre validadas. As `BACKEND_*` sao validadas apenas
 * localmente: em producao elas vivem nos secrets da Cloudflare, fora do
 * alcance do build, e quem as valida e o `envMiddleware` do Hono.
 */
function validateEnv(): Plugin {
  return {
    name: 'validate-env',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')

      parseEnv(frontendEnvSchema, env, 'frontend')

      if (config.command === 'serve') {
        parseEnv(backendEnvSchema, env, 'backend')
      }
    },
  }
}

export default defineConfig({
  // Substitui o `VITE_` padrao: so as `FRONTEND_*` sao embutidas no bundle do
  // browser. Uma `BACKEND_DATABASE_URL` no mesmo `.env` fica inacessivel ao
  // codigo do cliente, mesmo por engano.
  envPrefix: [FRONTEND_ENV_PREFIX],

  plugins: [
    validateEnv(),
    react(),
    tailwindcss(),
    workerdWasmModules(),
    devServer({
      entry: './src/server.tsx',
      // Roda o Worker com os bindings declarados no wrangler.jsonc e as
      // variaveis do `.dev.vars` disponiveis em `c.env` — exceto com
      // `LOCAL_DEV_SERVER=true`, onde roda em Node puro e `c.env` vem do
      // `.env` (ver comentario de `useLocalDevServer` acima).
      adapter: useLocalDevServer ? undefined : cloudflareAdapter,
      env: useLocalDevServer ? localEnv : undefined,
      exclude: HONO_EXCLUDE,
      // O Hono so responde JSON aqui; nao ha HTML para receber o script de HMR.
      injectClientScript: false,
    }),
  ],

  resolve: {
    alias: {
      '@': resolvePath('./src'),
      '@client': resolvePath('./src/client'),
      '@server': resolvePath('./src/server'),
      '@shared': resolvePath('./src/shared'),
    },
  },

  // `vite build` compila apenas o front-end. O bundle do Worker fica a cargo do
  // Wrangler, que le `main: ./src/server.tsx` no wrangler.jsonc.
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    sourcemap: true,
  },

  server: {
    port: 5173,
  },
})
