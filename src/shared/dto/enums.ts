import { z } from 'zod'

/**
 * Enums compartilhados entre features — a forma que trafega pela API.
 *
 * O banco guarda cada um como enum nativo do Postgres, sempre em MAIUSCULO
 * (ver `prisma/schema.prisma`). Aqui a API expoe a mesma coisa em minusculo.
 * `src/server/lib/db-enum.ts` faz essa conversao num unico lugar.
 */

export const PapelEnum = z.enum(['admin', 'professor'])
export type Papel = z.infer<typeof PapelEnum>

export const DiaSemanaEnum = z.enum(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'])
export type DiaSemana = z.infer<typeof DiaSemanaEnum>
