/**
 * Contrato compartilhado entre o Worker (Hono) e a SPA (React).
 *
 * Este e o unico ponto em que cliente e servidor se encontram: nenhum dos dois
 * importa arquivos do outro, apenas estes tipos — que somem em tempo de build.
 */

export type HealthStatus = 'ok' | 'degraded'

export interface DatabaseHealth {
  connected: boolean
  /** Tempo do `SELECT 1` no Neon, em milissegundos. */
  latencyMs: number | null
  error: string | null
}

export interface HealthResponse {
  status: HealthStatus
  runtime: 'cloudflare-workers'
  timestamp: string
  database: DatabaseHealth
}

export interface UserDTO {
  id: string
  email: string
  name: string | null
  createdAt: string
}

export interface ListUsersResponse {
  data: UserDTO[]
  count: number
}

export interface ApiErrorResponse {
  error: string
  message: string
}

/** Rotas expostas pelo Worker, centralizadas para evitar strings soltas. */
export const API_ROUTES = {
  health: '/health',
  users: '/users',
} as const
