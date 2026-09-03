import { HTTPException } from 'hono/http-exception'
import { sign } from 'hono/jwt'

import { SENHA_PLACEHOLDER, hashSenha, verificarSenha } from '../../lib/senha'
import { gerarToken, hashToken } from '../../lib/token'
import type { Papel, PrismaClient } from '../../db/generated/client'
import type {
  LoginInputType,
  LoginOutputType,
  ResetarSenhaInputType,
  SolicitarResetInputType,
  UsuarioCreateInputType,
  UsuarioOutputType,
  UsuarioUpdateInputType,
} from './auth.dto'

const SETE_DIAS_EM_SEGUNDOS = 7 * 24 * 60 * 60
const RESET_EXPIRACAO_MS = 60 * 60 * 1000

interface UsuarioRow {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
}

function paraUsuarioOutput(usuario: UsuarioRow, professorId: string | null): UsuarioOutputType {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    ativo: usuario.ativo,
    professorId,
  }
}

async function buscarProfessorIdPorUsuario(
  prisma: PrismaClient,
  usuarioId: string,
): Promise<string | null> {
  const professor = await prisma.professor.findUnique({
    where: { usuarioId },
    select: { id: true },
  })
  return professor?.id ?? null
}

async function gerarJwt(
  prisma: PrismaClient,
  jwtSecret: string,
  usuario: UsuarioRow,
): Promise<{ token: string; professorId: string | null }> {
  const professorId = await buscarProfessorIdPorUsuario(prisma, usuario.id)
  const token = await sign(
    {
      sub: usuario.id,
      papel: usuario.papel,
      professorId,
      exp: Math.floor(Date.now() / 1000) + SETE_DIAS_EM_SEGUNDOS,
    },
    jwtSecret,
    'HS256',
  )
  return { token, professorId }
}

/**
 * Mensagem deliberadamente identica para e-mail inexistente, senha errada e
 * usuario desativado — evita que o endpoint de login sirva de oraculo para
 * descobrir quais e-mails tem conta (mesma preocupacao do
 * `POST /auth/solicitar-reset`, que sempre responde 204).
 */
const CREDENCIAIS_INVALIDAS = 'E-mail ou senha invalidos.'

export async function autenticar(
  prisma: PrismaClient,
  jwtSecret: string,
  input: LoginInputType,
): Promise<LoginOutputType> {
  const usuario = await prisma.usuario.findUnique({ where: { email: input.email } })

  if (!usuario || !usuario.ativo) {
    throw new HTTPException(401, { message: CREDENCIAIS_INVALIDAS })
  }

  const senhaValida = await verificarSenha(input.senha, usuario.senhaHash)
  if (!senhaValida) {
    throw new HTTPException(401, { message: CREDENCIAIS_INVALIDAS })
  }

  const { token, professorId } = await gerarJwt(prisma, jwtSecret, usuario)
  return { token, usuario: paraUsuarioOutput(usuario, professorId) }
}

export async function usuarioAtual(prisma: PrismaClient, id: string): Promise<UsuarioOutputType> {
  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new HTTPException(401, { message: 'Usuario nao encontrado.' })
  }

  const professorId = await buscarProfessorIdPorUsuario(prisma, usuario.id)
  return paraUsuarioOutput(usuario, professorId)
}

export async function criarUsuario(
  prisma: PrismaClient,
  input: UsuarioCreateInputType,
): Promise<UsuarioOutputType> {
  const emailExistente = await prisma.usuario.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  if (emailExistente) {
    throw new HTTPException(409, { message: `O e-mail ${input.email} ja esta cadastrado.` })
  }

  let professor: { id: string; usuarioId: string | null } | null = null
  if (input.professorId) {
    professor = await prisma.professor.findUnique({
      where: { id: input.professorId },
      select: { id: true, usuarioId: true },
    })
    if (!professor) {
      throw new HTTPException(400, {
        message: 'professorId nao corresponde a nenhum professor existente.',
      })
    }
    if (professor.usuarioId) {
      throw new HTTPException(409, { message: 'Este professor ja possui um usuario vinculado.' })
    }
  }

  const usuario = await prisma.$transaction(async (tx) => {
    const criado = await tx.usuario.create({
      data: {
        nome: input.nome,
        email: input.email,
        papel: input.papel,
        senhaHash: SENHA_PLACEHOLDER,
      },
    })

    if (professor) {
      await tx.professor.update({ where: { id: professor.id }, data: { usuarioId: criado.id } })
    }

    return criado
  })

  return paraUsuarioOutput(usuario, professor?.id ?? null)
}

export async function atualizarUsuario(
  prisma: PrismaClient,
  id: string,
  input: UsuarioUpdateInputType,
): Promise<UsuarioOutputType> {
  const existente = await prisma.usuario.findUnique({ where: { id } })
  if (!existente) {
    throw new HTTPException(404, { message: 'Usuario nao encontrado.' })
  }

  const atualizado = await prisma.usuario.update({
    where: { id },
    data: {
      ...(input.papel !== undefined ? { papel: input.papel } : {}),
      ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
    },
  })

  const professorId = await buscarProfessorIdPorUsuario(prisma, id)
  return paraUsuarioOutput(atualizado, professorId)
}

export async function solicitarReset(
  prisma: PrismaClient,
  input: SolicitarResetInputType,
  ambiente: string,
): Promise<void> {
  const usuario = await prisma.usuario.findUnique({ where: { email: input.email } })
  // Sempre 204 no chamador, exista ou nao o e-mail — nao revela quem tem conta.
  if (!usuario) return

  const token = gerarToken()
  const resetTokenHash = await hashToken(token)
  const resetTokenExpiraEm = new Date(Date.now() + RESET_EXPIRACAO_MS)

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { resetTokenHash, resetTokenExpiraEm },
  })

  // Nenhum provedor de e-mail esta configurado neste projeto (nao ha
  // variavel de ambiente para isso) — o envio e, hoje, sempre um no-op
  // silencioso. Em dev o token vai pro console do servidor, unico jeito de
  // completar o fluxo sem um provedor de verdade.
  if (ambiente === 'development') {
    console.log(`[auth] token de reset de senha para ${input.email}: ${token}`)
  }
}

export async function resetarSenha(
  prisma: PrismaClient,
  input: ResetarSenhaInputType,
): Promise<void> {
  const resetTokenHash = await hashToken(input.token)
  const usuario = await prisma.usuario.findFirst({ where: { resetTokenHash } })

  const tokenValido =
    usuario?.resetTokenExpiraEm !== null &&
    usuario?.resetTokenExpiraEm !== undefined &&
    usuario.resetTokenExpiraEm.getTime() > Date.now()

  if (!usuario || !tokenValido) {
    throw new HTTPException(400, { message: 'Token invalido ou expirado.' })
  }

  const senhaHash = await hashSenha(input.novaSenha)
  await prisma.usuario.update({
    where: { id: usuario.id },
    // Token de uso unico: some do banco assim que consumido, com sucesso.
    data: { senhaHash, resetTokenHash: null, resetTokenExpiraEm: null },
  })
}
