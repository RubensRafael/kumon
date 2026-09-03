/**
 * Variaveis de ambiente do front-end.
 *
 * Apenas o que tem prefixo `VITE_` chega ao bundle do navegador. Segredos
 * (como a DATABASE_URL) ficam exclusivamente do lado do Worker.
 */
export const clientEnv = {
  /** Base das chamadas de API. Mesma origem por padrao — Vite em dev, Worker em producao. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  isDev: import.meta.env.DEV,
} as const
