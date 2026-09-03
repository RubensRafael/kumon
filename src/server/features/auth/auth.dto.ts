import { z } from 'zod'

import { PapelEnum } from '../../../shared/dto/enums'

export const LoginInput = z.object({
  email: z.email(),
  senha: z.string().min(1),
})

export const UsuarioOutput = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.email(),
  papel: PapelEnum,
  ativo: z.boolean(),
  professorId: z.uuid().nullable(),
})

export const LoginOutput = z.object({
  token: z.string(),
  usuario: UsuarioOutput,
})

/**
 * `professorId` e obrigatorio quando `papel === 'professor'` e proibido
 * quando `papel === 'admin'` — um admin nao tem vinculo de professor, e um
 * professor sem `professorId` ficaria sem `AuthContext.professorId`, quebrando
 * `scopeToProfessor` desde o primeiro login.
 */
export const UsuarioCreateInput = z
  .object({
    nome: z.string().min(1),
    email: z.email(),
    papel: PapelEnum,
    professorId: z.uuid().optional(),
  })
  .refine((data) => (data.papel === 'PROFESSOR') === (data.professorId !== undefined), {
    message: 'professorId e obrigatorio quando papel = "PROFESSOR" (e nao deve vir quando papel = "ADMIN").',
    path: ['professorId'],
  })

// Sem campo de senha — ela nasce com um placeholder nao-validavel no banco.
// `papel`/`professorId` nunca sao editaveis por aqui (so na criacao).
export const UsuarioUpdateInput = z
  .object({
    papel: PapelEnum.optional(),
    ativo: z.boolean().optional(),
  })
  .partial()

export const SolicitarResetInput = z.object({
  email: z.email(),
})

export const ResetarSenhaInput = z.object({
  token: z.string().min(1),
  novaSenha: z.string().min(8),
})

export type LoginInputType = z.infer<typeof LoginInput>
export type UsuarioOutputType = z.infer<typeof UsuarioOutput>
export type LoginOutputType = z.infer<typeof LoginOutput>
export type UsuarioCreateInputType = z.infer<typeof UsuarioCreateInput>
export type UsuarioUpdateInputType = z.infer<typeof UsuarioUpdateInput>
export type SolicitarResetInputType = z.infer<typeof SolicitarResetInput>
export type ResetarSenhaInputType = z.infer<typeof ResetarSenhaInput>
