/// <reference types="vite/client" />

import type { FrontendEnv } from '../shared/env'

declare global {
  /**
   * `import.meta.env` tipado a partir do mesmo schema zod que valida as
   * variaveis no build — nao ha uma segunda lista de chaves para manter em dia.
   */
  interface ImportMetaEnv extends FrontendEnv {}
}
