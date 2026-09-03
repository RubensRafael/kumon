import { z } from 'zod'

/**
 * Schemas das variaveis de ambiente.
 *
 * O prefixo e a fronteira de seguranca:
 *
 *   BACKEND_*   existe apenas no Worker (`c.env`) e no Prisma CLI
 *               (`process.env`). O `envPrefix` do Vite garante que nenhuma
 *               delas seja embutida no bundle do browser.
 *   FRONTEND_*  e embutida no bundle em tempo de build e, portanto, publica.
 *
 * Estes schemas sao usados em tres pontos, todos fora do bundle do browser:
 * o plugin de validacao do `vite.config.ts` (dev e build), o middleware de
 * ambiente do Hono (runtime do Worker) e o `prisma.config.ts`.
 */

const placeholderFree = (value: string) => !/[<>]/.test(value)
const PLACEHOLDER_MESSAGE = 'ainda contem os placeholders do .env.example'

export const backendEnvSchema = z.object({
  BACKEND_DATABASE_URL: z
    .string()
    .min(1, 'obrigatoria')
    .regex(/^postgres(ql)?:\/\//, 'deve ser uma connection string postgresql://')
    .refine(placeholderFree, PLACEHOLDER_MESSAGE),

  BACKEND_ENVIRONMENT: z.enum(['development', 'production']).default('development'),

  BACKEND_JWT_SECRET: z
    .string()
    .min(1, 'obrigatoria')
    .refine(placeholderFree, PLACEHOLDER_MESSAGE),
})

export const frontendEnvSchema = z.object({
  FRONTEND_API_BASE_URL: z
    .string()
    .min(1, 'obrigatoria')
    .refine(placeholderFree, PLACEHOLDER_MESSAGE)
    .default('/api'),

  FRONTEND_APP_NAME: z.string().min(1, 'obrigatoria').default('kumon'),
})

export type BackendEnv = z.infer<typeof backendEnvSchema>
export type FrontendEnv = z.infer<typeof frontendEnvSchema>

/** Prefixo que o Vite pode expor ao browser. Consumido pelo `vite.config.ts`. */
export const FRONTEND_ENV_PREFIX = 'FRONTEND_'

export class EnvValidationError extends Error {
  constructor(
    readonly scope: 'backend' | 'frontend',
    readonly issues: string[],
  ) {
    super(
      [
        `Variaveis de ambiente invalidas (${scope}):`,
        ...issues.map((issue) => `  - ${issue}`),
        '',
        'Confira o .env.example e preencha o seu .env.',
      ].join('\n'),
    )
    this.name = 'EnvValidationError'
  }
}

/**
 * Valida uma fonte de variaveis contra um schema e lanca um erro legivel,
 * listando cada variavel problematica em vez do dump padrao do zod.
 */
export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  source: unknown,
  scope: 'backend' | 'frontend',
): z.infer<TSchema> {
  const result = schema.safeParse(source)

  if (result.success) return result.data

  throw new EnvValidationError(
    scope,
    result.error.issues.map((issue) => {
      const key = issue.path.join('.') || '(raiz)'
      return `${key}: ${issue.message}`
    }),
  )
}
