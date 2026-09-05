import { z } from 'zod'

import { PapelEnum } from './enums'

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

/**
 * O token nunca aparece aqui — vai num cookie `HttpOnly` setado por
 * `POST /auth/login` (ver `authMiddleware`), nao no corpo da resposta.
 */
export const LoginOutput = z.object({
  usuario: UsuarioOutput,
})

/**
 * `professorId` e obrigatorio quando `papel === 'PROFESSOR'` — sem ele o
 * `AuthContext.professorId` ficaria vazio, quebrando `scopeToProfessor` desde
 * o primeiro login. Um `ADMIN` pode opcionalmente ter `professorId`
 * tambem: a pessoa administra E da aula, e em toda checagem de permissao
 * (`requireAdmin`, `scopeToProfessor`, `restrictProfessorSelf`) `papel`
 * sozinho ja decide tudo — nenhuma delas olha para a presenca de
 * `professorId`, entao um admin com o vinculo preenchido nao ganha nem perde
 * nada: continua sem filtro nenhum, só passa a poder ser referenciado como
 * professor (`Matricula.professorId` etc.) sem precisar de um segundo login.
 */
export const UsuarioCreateInput = z
  .object({
    nome: z.string().min(1),
    email: z.email(),
    papel: PapelEnum,
    professorId: z.uuid().optional(),
  })
  .refine((data) => data.papel !== 'PROFESSOR' || data.professorId !== undefined, {
    message: 'professorId e obrigatorio quando papel = "PROFESSOR".',
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
