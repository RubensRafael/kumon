import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import devServer from '@hono/vite-dev-server'
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

/** Prefixo unico da API. Tudo fora dele pertence ao front-end. */
const API_PREFIX = '/api'

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

const WASM_MODULE_QUERY = '?module'
const VIRTUAL_PREFIX = '\0wasm-module:'

/**
 * O Prisma Client gerado para `runtime = "workerd"` carrega o Query Compiler
 * com `import('./query_compiler_bg.wasm?module')` — a sintaxe de WASM module do
 * Cloudflare Workers, que o Wrangler entende nativamente no build.
 *
 * O dev-server do Vite executa esse mesmo codigo em Node e nao conhece o sufixo
 * `?module`, entao aqui o import e redirecionado para um modulo virtual que
 * compila o binario e devolve um `WebAssembly.Module` — exatamente o que o
 * workerd entregaria em producao.
 */
function workerdWasmModules(): Plugin {
  return {
    name: 'workerd-wasm-modules',
    enforce: 'pre',
    apply: 'serve',

    resolveId(source, importer) {
      if (!importer || !source.endsWith(`.wasm${WASM_MODULE_QUERY}`)) return null

      const filePath = source.slice(0, -WASM_MODULE_QUERY.length)
      return VIRTUAL_PREFIX + path.resolve(path.dirname(importer), filePath)
    },

    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null

      const filePath = id.slice(VIRTUAL_PREFIX.length)

      if (!existsSync(filePath)) {
        this.error(`WASM nao encontrado: ${filePath}. Rode \`npm run db:generate\`.`)
      }

      // O binario e lido em tempo de execucao para nao inflar o grafo de modulos.
      return [
        `import { readFileSync } from 'node:fs'`,
        `export default new WebAssembly.Module(readFileSync(${JSON.stringify(filePath)}))`,
      ].join('\n')
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    workerdWasmModules(),
    devServer({
      entry: './src/server.tsx',
      // Roda o Worker com os bindings declarados no wrangler.jsonc e as
      // variaveis do `.dev.vars` disponiveis em `c.env`.
      adapter: cloudflareAdapter,
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
