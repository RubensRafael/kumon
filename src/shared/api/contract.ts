import type {
  CreateUserInput,
  HealthResponse,
  ListUsersQuery,
  ListUsersResponse,
  UserDto,
} from '../dto'

/**
 * Contrato da API — a fronteira entre o Worker e a SPA.
 *
 * `apiEndpoints` existe em runtime (apenas strings), enquanto `ApiContract`
 * descreve, em nivel de tipo, o que cada rota recebe e devolve. Os tipos vem
 * dos DTOs em `src/shared/dto`, importados com `import type`: o zod fica
 * inteiramente de fora do bundle do browser.
 *
 * O servidor tipa cada `c.json(...)` com `ApiResponse<'nomeDaRota'>` e o
 * cliente tipa cada chamada com o mesmo tipo. Mudou um lado, o outro quebra em
 * tempo de compilacao — sem que o front-end precise conhecer o Hono, o Prisma
 * ou o schema do banco.
 */
export const apiEndpoints = {
  health: { method: 'GET', path: '/health' },
  listUsers: { method: 'GET', path: '/users' },
  createUser: { method: 'POST', path: '/users' },
} as const

export type ApiEndpointName = keyof typeof apiEndpoints

interface EndpointShape {
  query?: unknown
  body?: unknown
  response: unknown
}

export interface ApiContract extends Record<ApiEndpointName, EndpointShape> {
  health: { response: HealthResponse }
  listUsers: { query: ListUsersQuery; response: ListUsersResponse }
  createUser: { body: CreateUserInput; response: UserDto }
}

/** Tipo de retorno de uma rota: `ApiResponse<'listUsers'>`. */
export type ApiResponse<TName extends ApiEndpointName> = ApiContract[TName]['response']

/** Query string aceita por uma rota, ou `never` se ela nao recebe query. */
export type ApiQuery<TName extends ApiEndpointName> = ApiContract[TName] extends {
  query: infer TQuery
}
  ? TQuery
  : never

/** Corpo JSON aceito por uma rota, ou `never` se ela nao recebe corpo. */
export type ApiBody<TName extends ApiEndpointName> = ApiContract[TName] extends {
  body: infer TBody
}
  ? TBody
  : never

/**
 * Argumentos de uma chamada, montados a partir do contrato: rotas sem query e
 * sem body ficam sem argumento obrigatorio.
 */
export type ApiRequestArgs<TName extends ApiEndpointName> = ([ApiQuery<TName>] extends [never]
  ? { query?: undefined }
  : { query: ApiQuery<TName> }) &
  ([ApiBody<TName>] extends [never] ? { body?: undefined } : { body: ApiBody<TName> })
