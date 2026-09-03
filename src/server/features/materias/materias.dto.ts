import { z } from 'zod'

export const MateriaOutput = z.object({
  id: z.uuid(),
  nome: z.string(),
  ativo: z.boolean(),
})

export const MateriaCreateInput = z.object({ nome: z.string().min(1) })

export const MateriaUpdateInput = z
  .object({
    nome: z.string().min(1).optional(),
    ativo: z.boolean().optional(),
  })
  .partial()

/** `?incluirInativas=true` em `GET /materias` — string, nunca boolean de verdade em querystring. */
export const ListarMateriasQuery = z.object({
  incluirInativas: z.enum(['true', 'false']).optional(),
})

export const ConteudoOutput = z.object({
  id: z.uuid(),
  materiaId: z.uuid(),
  nome: z.string(),
  ativo: z.boolean(),
})

export const ConteudoCreateInput = z.object({
  materiaId: z.uuid(),
  nome: z.string().min(1),
})

/**
 * A spec define `ConteudoUpdateInput = ConteudoCreateInput.partial()`
 * literalmente, o que deixaria de fora o campo `ativo` — mas a regra de
 * negocio da mesma secao diz que a desativacao de conteudo tambem e sempre
 * `PUT { ativo: false }` ("nao existe DELETE em nenhuma das duas"). Resolvido
 * a favor da regra de negocio: `ativo` foi adicionado aqui (ver
 * docs/pr-04-materias-conteudos.md, "Decisoes tomadas").
 */
export const ConteudoUpdateInput = ConteudoCreateInput.partial().extend({
  ativo: z.boolean().optional(),
})

export type MateriaOutputType = z.infer<typeof MateriaOutput>
export type MateriaCreateInputType = z.infer<typeof MateriaCreateInput>
export type MateriaUpdateInputType = z.infer<typeof MateriaUpdateInput>
export type ListarMateriasQueryType = z.infer<typeof ListarMateriasQuery>
export type ConteudoOutputType = z.infer<typeof ConteudoOutput>
export type ConteudoCreateInputType = z.infer<typeof ConteudoCreateInput>
export type ConteudoUpdateInputType = z.infer<typeof ConteudoUpdateInput>
