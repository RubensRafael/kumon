import type {
  ConteudoCreateInputType,
  ConteudoOutputType,
  ConteudoUpdateInputType,
  HealthResponse,
  ListarMateriasQueryType,
  LoginInputType,
  LoginOutputType,
  MateriaCreateInputType,
  MateriaOutputType,
  MateriaUpdateInputType,
  PainelDadosOutputType,
  ResetarSenhaInputType,
  SolicitarResetInputType,
  UsuarioOutputType,
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
  login: { method: 'POST', path: '/auth/login' },
  logout: { method: 'POST', path: '/auth/logout' },
  me: { method: 'GET', path: '/me' },
  solicitarReset: { method: 'POST', path: '/auth/solicitar-reset' },
  resetarSenha: { method: 'POST', path: '/auth/resetar-senha' },
  obterPainel: { method: 'GET', path: '/painel' },
  listarMaterias: { method: 'GET', path: '/materias' },
  criarMateria: { method: 'POST', path: '/materias' },
  atualizarMateria: { method: 'PUT', path: '/materias/:id' },
  listarConteudosDaMateria: { method: 'GET', path: '/materias/:id/conteudos' },
  criarConteudo: { method: 'POST', path: '/conteudos' },
  atualizarConteudo: { method: 'PUT', path: '/conteudos/:id' },
} as const

export type ApiEndpointName = keyof typeof apiEndpoints

interface EndpointShape {
  query?: unknown
  body?: unknown
  response: unknown
}

/** Nomes de segmento `:param` de um path, ex.: `'/alunos/:alunoId/matriculas'` -> `'alunoId'`. */
type ExtractParamNames<TPath extends string> = TPath extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractParamNames<`/${Rest}`>
  : TPath extends `${string}:${infer Param}`
    ? Param
    : never

/** Params de path de uma rota, ou `undefined` se ela não tem nenhum `:param`. */
export type ApiParams<TName extends ApiEndpointName> = [
  ExtractParamNames<(typeof apiEndpoints)[TName]['path']>,
] extends [never]
  ? undefined
  : Record<ExtractParamNames<(typeof apiEndpoints)[TName]['path']>, string>

export interface ApiContract extends Record<ApiEndpointName, EndpointShape> {
  health: { response: HealthResponse }
  login: { body: LoginInputType; response: LoginOutputType }
  logout: { response: void }
  me: { response: UsuarioOutputType }
  solicitarReset: { body: SolicitarResetInputType; response: void }
  resetarSenha: { body: ResetarSenhaInputType; response: void }
  obterPainel: { response: PainelDadosOutputType }
  listarMaterias: { query: ListarMateriasQueryType; response: MateriaOutputType[] }
  criarMateria: { body: MateriaCreateInputType; response: MateriaOutputType }
  atualizarMateria: { body: MateriaUpdateInputType; response: MateriaOutputType }
  listarConteudosDaMateria: { response: ConteudoOutputType[] }
  criarConteudo: { body: ConteudoCreateInputType; response: ConteudoOutputType }
  atualizarConteudo: { body: ConteudoUpdateInputType; response: ConteudoOutputType }
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
 * Argumentos de uma chamada, montados a partir do contrato: rotas sem query,
 * sem body e sem `:param` no path ficam sem argumento obrigatorio.
 */
export type ApiRequestArgs<TName extends ApiEndpointName> = ([ApiQuery<TName>] extends [never]
  ? { query?: undefined }
  : { query: ApiQuery<TName> }) &
  ([ApiBody<TName>] extends [never] ? { body?: undefined } : { body: ApiBody<TName> }) &
  (ApiParams<TName> extends undefined ? { params?: undefined } : { params: ApiParams<TName> })
