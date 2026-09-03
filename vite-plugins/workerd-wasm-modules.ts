import { existsSync } from 'node:fs'
import path from 'node:path'

import type { Plugin } from 'vite'

const WASM_MODULE_QUERY = '?module'
const VIRTUAL_PREFIX = '\0wasm-module:'

/**
 * O Prisma Client gerado para `runtime = "cloudflare"` carrega o Query Compiler
 * com `import('./query_compiler_bg.wasm?module')` — a sintaxe de WASM module do
 * Cloudflare Workers, que o Wrangler entende nativamente no build.
 *
 * Tanto o dev-server do Vite quanto o Vitest executam esse mesmo codigo em
 * Node e nao conhecem o sufixo `?module`, entao aqui o import e redirecionado
 * para um modulo virtual que compila o binario e devolve um
 * `WebAssembly.Module` — exatamente o que o workerd entregaria em producao.
 *
 * Extraido para um arquivo proprio porque os dois consumidores (`vite.config.ts`
 * e `vitest.config.ts`) precisam do mesmo plugin: os testes e2e tambem importam
 * o Prisma Client gerado, fora do processo do Worker.
 */
export function workerdWasmModules(): Plugin {
  return {
    name: 'workerd-wasm-modules',
    enforce: 'pre',

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
