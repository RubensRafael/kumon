import { beforeEach, describe, expect, it } from 'vitest'

import type { AlunoOutputType } from '../../src/server/features/alunos/alunos.dto'
import { authHeader, obterCookie } from '../helpers/auth'
import {
  criarAluno,
  criarMateria,
  criarMatricula,
  criarProfessor,
  criarUsuarioAdmin,
  criarUsuarioProfessor,
} from '../helpers/factories'
import { app, resetDb, testEnv } from '../helpers/setup'

const jsonHeaders = { 'Content-Type': 'application/json' }

async function cookieAdmin() {
  const { usuario, senha } = await criarUsuarioAdmin()
  return obterCookie(usuario.email, senha)
}

describe('alunos', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/alunos', () => {
    it('admin ve todos os alunos, sem filtro', async () => {
      await criarAluno({ nome: 'Ana' })
      await criarAluno({ nome: 'Bruno' })
      const cookie = await cookieAdmin()

      const response = await app.request('/api/alunos', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as AlunoOutputType[]
      expect(body.length).toBe(2)
    })

    it('professor so ve alunos com matricula ativa vinculada a ele (via EXISTS, sem duplicar linha)', async () => {
      const materia = await criarMateria({ nome: 'Materia' })
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()

      const alunoDoProfessor = await criarAluno({ nome: 'Aluno do professor' })
      await criarMatricula({ alunoId: alunoDoProfessor.id, professorId: professor.id, materiaId: materia.id })

      const alunoDeOutro = await criarAluno({ nome: 'Aluno de outro professor' })
      await criarMatricula({ alunoId: alunoDeOutro.id, professorId: outroProfessor.id, materiaId: materia.id })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request('/api/alunos', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as AlunoOutputType[]

      expect(body.map((a) => a.id)).toEqual([alunoDoProfessor.id])
    })

    it('professor nao ve aluno cuja unica matricula com ele esta encerrada', async () => {
      const materia = await criarMateria({ nome: 'Materia' })
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const aluno = await criarAluno({ nome: 'Aluno' })
      await criarMatricula({
        alunoId: aluno.id,
        professorId: professor.id,
        materiaId: materia.id,
        situacao: 'ENCERRADA',
      })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request('/api/alunos', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as AlunoOutputType[]
      expect(body).toEqual([])
    })

    it('um aluno com duas matriculas com o mesmo professor aparece uma unica vez', async () => {
      const materia1 = await criarMateria({ nome: 'Materia 1' })
      const materia2 = await criarMateria({ nome: 'Materia 2' })
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const aluno = await criarAluno({ nome: 'Aluno' })
      await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia1.id })
      await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia2.id })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request('/api/alunos', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as AlunoOutputType[]
      expect(body.length).toBe(1)
    })
  })

  describe('GET /api/alunos/:id', () => {
    it('professor pedindo aluno de outro professor -> 404 (nunca 403)', async () => {
      const materia = await criarMateria({ nome: 'Materia' })
      const { usuario, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()
      const aluno = await criarAluno({ nome: 'Aluno' })
      await criarMatricula({ alunoId: aluno.id, professorId: outroProfessor.id, materiaId: materia.id })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(`/api/alunos/${aluno.id}`, { headers: authHeader(cookie) }, testEnv)
      expect(response.status).toBe(404)
    })

    it('admin encontra qualquer aluno por id', async () => {
      const aluno = await criarAluno({ nome: 'Aluno' })
      const cookie = await cookieAdmin()
      const response = await app.request(`/api/alunos/${aluno.id}`, { headers: authHeader(cookie) }, testEnv)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/alunos', () => {
    it('admin cria aluno sem criar matricula', async () => {
      const cookie = await cookieAdmin()
      const response = await app.request(
        '/api/alunos',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ nome: 'Novo Aluno', dataMatricula: '2026-01-15' }),
        },
        testEnv,
      )

      expect(response.status).toBe(201)
      const body = (await response.json()) as AlunoOutputType
      expect(body.situacao).toBe('ATIVO')
      expect(body.dataMatricula).toBe('2026-01-15T00:00:00.000Z')

      const matriculas = await app.request(
        `/api/alunos/${body.id}`,
        { headers: authHeader(cookie) },
        testEnv,
      )
      expect(matriculas.status).toBe(200)
    })

    it('professor nao pode criar aluno -> 403', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(
        '/api/alunos',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ nome: 'X', dataMatricula: '2026-01-15' }),
        },
        testEnv,
      )
      expect(response.status).toBe(403)
    })

    it('data invalida -> 400 legivel, nao erro cru do banco', async () => {
      const cookie = await cookieAdmin()
      const response = await app.request(
        '/api/alunos',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ nome: 'X', dataMatricula: 'nao-e-uma-data' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/alunos/:id', () => {
    it('admin-only mesmo para o professor "dono" do aluno', async () => {
      const materia = await criarMateria({ nome: 'Materia' })
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const aluno = await criarAluno({ nome: 'Aluno' })
      await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(
        `/api/alunos/${aluno.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ situacao: 'TRANCADO' }),
        },
        testEnv,
      )
      expect(response.status).toBe(403)
    })

    it('admin atualiza aluno', async () => {
      const aluno = await criarAluno({ nome: 'Aluno' })
      const cookie = await cookieAdmin()
      const response = await app.request(
        `/api/alunos/${aluno.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ situacao: 'TRANCADO', zonaVermelha: true }),
        },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as AlunoOutputType
      expect(body.situacao).toBe('TRANCADO')
      expect(body.zonaVermelha).toBe(true)
    })
  })
})
