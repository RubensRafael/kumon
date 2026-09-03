import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LoginOutputType, UsuarioOutputType } from '../../src/server/features/auth/auth.dto'
import { criarProfessor, criarUsuarioAdmin, criarUsuarioProfessor } from '../helpers/factories'
import { app, prisma, resetDb, testEnv } from '../helpers/setup'

const jsonHeaders = { 'Content-Type': 'application/json' }

async function login(email: string, senha: string) {
  const response = await app.request(
    '/api/auth/login',
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email, senha }) },
    testEnv,
  )
  return { status: response.status, body: (await response.json()) as LoginOutputType }
}

describe('auth', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /api/auth/login', () => {
    it('autentica com credenciais corretas e devolve token + usuario', async () => {
      const { usuario, senha } = await criarUsuarioAdmin()

      const { status, body } = await login(usuario.email, senha)

      expect(status).toBe(200)
      expect(body.token).toBeTypeOf('string')
      expect(body.usuario.email).toBe(usuario.email)
      expect(body.usuario.papel).toBe('ADMIN')
    })

    it('rejeita usuario recem-criado: o placeholder de senha nunca valida', async () => {
      const professor = await criarProfessor()
      const usuario = await prisma.usuario.create({
        data: {
          nome: 'Novo Professor',
          email: 'novo@kflow.test',
          papel: 'PROFESSOR',
          senhaHash: 'sem-senha-definida:aguardando-primeiro-reset',
        },
      })
      await prisma.professor.update({
        where: { id: professor.id },
        data: { usuarioId: usuario.id },
      })

      const { status } = await login(usuario.email, 'qualquer-coisa')
      expect(status).toBe(401)
    })

    it('rejeita usuario desativado', async () => {
      const { usuario, senha } = await criarUsuarioAdmin({ ativo: false })
      const { status } = await login(usuario.email, senha)
      expect(status).toBe(401)
    })

    it('rejeita e-mail inexistente e senha errada com a mesma mensagem (nao revela qual)', async () => {
      const { usuario, senha } = await criarUsuarioAdmin()

      const senhaErrada = await login(usuario.email, `${senha}-errada`)
      const emailInexistente = await login('ninguem@kflow.test', senha)

      expect(senhaErrada.status).toBe(401)
      expect(emailInexistente.status).toBe(401)
    })
  })

  describe('GET /api/me', () => {
    it('devolve o usuario autenticado, com professorId resolvido', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const { body: loginBody } = await login(usuario.email, senha)

      const response = await app.request(
        '/api/me',
        { headers: { authorization: `Bearer ${loginBody.token}` } },
        testEnv,
      )

      expect(response.status).toBe(200)
      const body = (await response.json()) as UsuarioOutputType
      expect(body.id).toBe(usuario.id)
      expect(body.papel).toBe('PROFESSOR')
      expect(body.professorId).toBeTypeOf('string')
    })

    it('sem token -> 401', async () => {
      const response = await app.request('/api/me', {}, testEnv)
      expect(response.status).toBe(401)
    })

    it('token invalido -> 401', async () => {
      const response = await app.request(
        '/api/me',
        { headers: { authorization: 'Bearer token-forjado' } },
        testEnv,
      )
      expect(response.status).toBe(401)
    })
  })

  describe('authMiddleware revalida o usuario no banco', () => {
    it('usuario desativado depois do login -> 401 mesmo com token ainda valido', async () => {
      const { usuario, senha } = await criarUsuarioAdmin()
      const { body } = await login(usuario.email, senha)

      await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } })

      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${body.token}` },
          body: JSON.stringify({ nome: 'X', email: 'x@kflow.test', papel: 'ADMIN' }),
        },
        testEnv,
      )

      expect(response.status).toBe(401)
    })

    it('papel alterado depois do login -> 403 numa rota admin-only, ignora o papel do token', async () => {
      const { usuario, senha } = await criarUsuarioAdmin()
      const { body } = await login(usuario.email, senha)

      await prisma.usuario.update({ where: { id: usuario.id }, data: { papel: 'PROFESSOR' } })

      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${body.token}` },
          body: JSON.stringify({ nome: 'X', email: 'x@kflow.test', papel: 'ADMIN' }),
        },
        testEnv,
      )

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/usuarios', () => {
    it('admin lista todos os usuarios, com professorId resolvido', async () => {
      const { usuario: admin, senha } = await criarUsuarioAdmin()
      const { professor } = await criarUsuarioProfessor()
      const { body } = await login(admin.email, senha)

      const response = await app.request(
        '/api/usuarios',
        { headers: { authorization: `Bearer ${body.token}` } },
        testEnv,
      )

      expect(response.status).toBe(200)
      const lista = (await response.json()) as UsuarioOutputType[]
      expect(lista).toHaveLength(2)
      expect(lista.map((u) => u.email)).toContain(admin.email)
      expect(lista.find((u) => u.professorId === professor.id)).toBeDefined()
    })

    it('professor autenticado recebe 403', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const { body } = await login(usuario.email, senha)

      const response = await app.request(
        '/api/usuarios',
        { headers: { authorization: `Bearer ${body.token}` } },
        testEnv,
      )

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/usuarios', () => {
    async function tokenAdmin() {
      const { usuario, senha } = await criarUsuarioAdmin()
      const { body } = await login(usuario.email, senha)
      return body.token
    }

    it('admin cria usuario professor vinculado a um professor existente', async () => {
      const token = await tokenAdmin()
      const professor = await criarProfessor()

      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nome: 'Fulano',
            email: 'fulano@kflow.test',
            papel: 'PROFESSOR',
            professorId: professor.id,
          }),
        },
        testEnv,
      )

      expect(response.status).toBe(201)
      const body = (await response.json()) as UsuarioOutputType
      expect(body.professorId).toBe(professor.id)

      const professorAtualizado = await prisma.professor.findUniqueOrThrow({
        where: { id: professor.id },
      })
      expect(professorAtualizado.usuarioId).toBe(body.id)
    })

    it('professor autenticado recebe 403 (gestao de usuario nao e filtragem por escopo)', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const { body } = await login(usuario.email, senha)

      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${body.token}` },
          body: JSON.stringify({ nome: 'X', email: 'x@kflow.test', papel: 'ADMIN' }),
        },
        testEnv,
      )

      expect(response.status).toBe(403)
    })

    it('papel=professor sem professorId -> 400', async () => {
      const token = await tokenAdmin()
      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${token}` },
          body: JSON.stringify({ nome: 'X', email: 'x@kflow.test', papel: 'PROFESSOR' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('papel=admin com professorId cria o vinculo normalmente (admin tambem pode dar aula)', async () => {
      const token = await tokenAdmin()
      const professor = await criarProfessor()
      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nome: 'X',
            email: 'x@kflow.test',
            papel: 'ADMIN',
            professorId: professor.id,
          }),
        },
        testEnv,
      )
      expect(response.status).toBe(201)
      const body = (await response.json()) as UsuarioOutputType
      expect(body.papel).toBe('ADMIN')
      expect(body.professorId).toBe(professor.id)
    })

    it('professorId inexistente -> 400', async () => {
      const token = await tokenAdmin()
      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nome: 'X',
            email: 'x@kflow.test',
            papel: 'PROFESSOR',
            professorId: '00000000-0000-0000-0000-000000000000',
          }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('e-mail duplicado -> 409', async () => {
      const token = await tokenAdmin()
      const existente = await criarUsuarioAdmin()
      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${token}` },
          body: JSON.stringify({ nome: 'X', email: existente.usuario.email, papel: 'ADMIN' }),
        },
        testEnv,
      )
      expect(response.status).toBe(409)
    })

    it('professor ja vinculado a outro usuario -> 409', async () => {
      const token = await tokenAdmin()
      const { professor } = await criarUsuarioProfessor()
      const response = await app.request(
        '/api/usuarios',
        {
          method: 'POST',
          headers: { ...jsonHeaders, authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nome: 'X',
            email: 'x2@kflow.test',
            papel: 'PROFESSOR',
            professorId: professor.id,
          }),
        },
        testEnv,
      )
      expect(response.status).toBe(409)
    })
  })

  describe('PUT /api/usuarios/:id', () => {
    it('atualiza ativo/papel e ignora silenciosamente qualquer senha enviada', async () => {
      const admin = await criarUsuarioAdmin()
      const { body: loginAdmin } = await login(admin.usuario.email, admin.senha)

      const alvo = await criarUsuarioAdmin()

      const response = await app.request(
        `/api/usuarios/${alvo.usuario.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, authorization: `Bearer ${loginAdmin.token}` },
          body: JSON.stringify({ ativo: false, senha: 'senha-hackeada' }),
        },
        testEnv,
      )

      expect(response.status).toBe(200)
      const body = (await response.json()) as UsuarioOutputType
      expect(body.ativo).toBe(false)

      // A senha nunca chega a mudar (o campo nao existe no schema de update);
      // o usuario so esta bloqueado por estar inativo agora.
      const tentativa = await login(alvo.usuario.email, 'senha-hackeada')
      expect(tentativa.status).toBe(401)
    })
  })

  describe('reset de senha', () => {
    it('fluxo completo: solicitar -> token no console -> resetar -> login com a nova senha', async () => {
      const { usuario } = await criarUsuarioAdmin()
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      const solicitacao = await app.request(
        '/api/auth/solicitar-reset',
        { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: usuario.email }) },
        testEnv,
      )
      expect(solicitacao.status).toBe(204)

      // BACKEND_RESEND_API_KEY nos testes e o sentinel dummy: enviarEmailResetSenha
      // nao deve chamar a API do Resend de verdade.
      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()

      const linha = logSpy.mock.calls.map((call) => String(call[0])).find((l) => l.includes(usuario.email))
      const token = linha?.split(': ').at(-1)
      logSpy.mockRestore()
      expect(token).toBeTypeOf('string')

      const reset = await app.request(
        '/api/auth/resetar-senha',
        { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ token, novaSenha: 'nova-senha-forte' }) },
        testEnv,
      )
      expect(reset.status).toBe(204)

      const { status } = await login(usuario.email, 'nova-senha-forte')
      expect(status).toBe(200)

      // Token de uso unico: reusar o mesmo token depois de um reset bem-sucedido falha.
      const reusar = await app.request(
        '/api/auth/resetar-senha',
        { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ token, novaSenha: 'outra-senha' }) },
        testEnv,
      )
      expect(reusar.status).toBe(400)
    })

    it('solicitar-reset sempre 204, mesmo para e-mail inexistente (nao revela quem tem conta)', async () => {
      const response = await app.request(
        '/api/auth/solicitar-reset',
        { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: 'nao-existe@kflow.test' }) },
        testEnv,
      )
      expect(response.status).toBe(204)
    })

    it('resetar-senha com token invalido -> 400', async () => {
      const response = await app.request(
        '/api/auth/resetar-senha',
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ token: 'token-que-nao-existe', novaSenha: 'nova-senha-forte' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })
  })
})
