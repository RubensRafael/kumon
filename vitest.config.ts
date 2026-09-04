import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import { workerdWasmModules } from './vite-plugins/workerd-wasm-modules.ts'

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

/**
 * Config do Vitest para os testes e2e e unitarios.
 *
 * Roda inteiramente em Node (nunca no workerd), entao o Prisma Client fala
 * com o Postgres via `@prisma/adapter-pg`. O plugin de WASM ainda e
 * necessario: o client gerado (`runtime = "cloudflare"`) usa a mesma sintaxe
 * `import('...wasm?module')` independente do adapter usado em runtime.
 */
export default defineConfig({
  plugins: [workerdWasmModules()],

  resolve: {
    alias: {
      '@': resolvePath('./src'),
      '@client': resolvePath('./src/client'),
      '@server': resolvePath('./src/server'),
      '@shared': resolvePath('./src/shared'),
    },
  },

  test: {
    include: ['tests/e2e/**/*.e2e.test.ts', 'tests/unit/**/*.test.ts'],
    environment: 'node',
    // e2e contra um Postgres real (docker-compose): serializado para evitar
    // que dois arquivos rodando em paralelo disputem o mesmo TRUNCATE.
    fileParallelism: false,
    hookTimeout: 20_000,
    testTimeout: 20_000,
  },
})
