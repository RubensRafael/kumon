import { beforeEach, describe, expect, it } from 'vitest'

import type {
  ConteudoOutputType,
  MateriaOutputType,
} from '../../src/server/features/materias/materias.dto'
import { authHeader, obterToken } from '../helpers/auth'
import { criarMateria, criarUsuarioAdmin, criarUsuarioProfessor } from '../helpers/factories'
import { app, prisma, resetDb, testEnv } from '../helpers/setup'

const jsonHeaders = { 'Content-Type': 'application/json' }

async function tokenAdmin() {
  const { usuario, senha } = await criarUsuarioAdmin()
  return obterToken(usuario.email, senha)
}

describe('materias e conteudos', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/materias', () => {
    it('por padrao esconde materias inativas; ?incluirInativas=true traz todas', async () => {
      const token = await tokenAdmin()
      await criarMateria({ nome: 'Ativa', ativo: true })
      await criarMateria({ nome: 'Inativa', ativo: false })

      const padrao = await app.request('/api/materias', { headers: authHeader(token) }, testEnv)
      const padraoBody = (await padrao.json()) as MateriaOutputType[]
      expect(padraoBody.every((m) => m.ativo)).toBe(true)
      expect(padraoBody.length).toBe(1)

      const todas = await app.request(
        '/api/materias?incluirInativas=true',
        { headers: authHeader(token) },
        testEnv,
      )
      const todasBody = (await todas.json()) as MateriaOutputType[]
      expect(todasBody.length).toBe(2)
    })
  })

  describe('POST /api/materias', () => {
    it('admin cria materia', async () => {
      const token = await tokenAdmin()
      const response = await app.request(
        '/api/materias',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ nome: 'Matematica' }) },
        testEnv,
      )
      expect(response.status).toBe(201)
      const body = (await response.json()) as MateriaOutputType
      expect(body.nome).toBe('Matematica')
      expect(body.ativo).toBe(true)
    })

    it('professor nao pode criar materia -> 403', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const token = await obterToken(usuario.email, senha)
      const response = await app.request(
        '/api/materias',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ nome: 'X' }) },
        testEnv,
      )
      expect(response.status).toBe(403)
    })
  })

  describe('PUT /api/materias/:id', () => {
    it('desativa via ativo:false (soft delete) — nao existe DELETE', async () => {
      const token = await tokenAdmin()
      const materia = await criarMateria()

      const response = await app.request(
        `/api/materias/${materia.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ ativo: false }) },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as MateriaOutputType
      expect(body.ativo).toBe(false)
    })

    it('desativar materia nao desativa seus conteudos em cascata', async () => {
      const token = await tokenAdmin()
      const materia = await criarMateria()
      const conteudo = await prisma.conteudo.create({ data: { materiaId: materia.id, nome: 'Unidade 1' } })

      await app.request(
        `/api/materias/${materia.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ ativo: false }) },
        testEnv,
      )

      const conteudoAtual = await prisma.conteudo.findUniqueOrThrow({ where: { id: conteudo.id } })
      expect(conteudoAtual.ativo).toBe(true)
    })
  })

  describe('GET /api/materias/:id/conteudos', () => {
    it('lista conteudos (ativos e inativos) da materia', async () => {
      const token = await tokenAdmin()
      const materia = await criarMateria()
      await prisma.conteudo.create({ data: { materiaId: materia.id, nome: 'Ativo', ativo: true } })
      await prisma.conteudo.create({ data: { materiaId: materia.id, nome: 'Inativo', ativo: false } })

      const response = await app.request(
        `/api/materias/${materia.id}/conteudos`,
        { headers: authHeader(token) },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as ConteudoOutputType[]
      expect(body.length).toBe(2)
    })

    it('404 para materia inexistente', async () => {
      const token = await tokenAdmin()
      const response = await app.request(
        '/api/materias/00000000-0000-0000-0000-000000000000/conteudos',
        { headers: authHeader(token) },
        testEnv,
      )
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/conteudos', () => {
    it('cria conteudo numa materia ativa', async () => {
      const token = await tokenAdmin()
      const materia = await criarMateria()

      const response = await app.request(
        '/api/conteudos',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ materiaId: materia.id, nome: 'Unidade 1' }),
        },
        testEnv,
      )
      expect(response.status).toBe(201)
    })

    it('rejeita materiaId inexistente -> 400', async () => {
      const token = await tokenAdmin()
      const response = await app.request(
        '/api/conteudos',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ materiaId: '00000000-0000-0000-0000-000000000000', nome: 'X' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('rejeita materia inativa -> 400', async () => {
      const token = await tokenAdmin()
      const materia = await criarMateria({ ativo: false })
      const response = await app.request(
        '/api/conteudos',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ materiaId: materia.id, nome: 'X' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/conteudos/:id', () => {
    it('desativa via ativo:false (soft delete)', async () => {
      const token = await tokenAdmin()
      const materia = await criarMateria()
      const conteudo = await prisma.conteudo.create({ data: { materiaId: materia.id, nome: 'Unidade 1' } })

      const response = await app.request(
        `/api/conteudos/${conteudo.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ ativo: false }) },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as ConteudoOutputType
      expect(body.ativo).toBe(false)
    })
  })
})
