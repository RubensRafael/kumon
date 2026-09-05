import { beforeEach, describe, expect, it } from 'vitest'

import type { ProfessorOutputType } from '../../src/shared/dto/professores.dto'
import type { ApiError } from '../../src/shared/dto'
import { authHeader, obterCookie } from '../helpers/auth'
import { criarMateria, criarProfessor, criarUsuarioAdmin, criarUsuarioProfessor } from '../helpers/factories'
import { app, resetDb, testEnv } from '../helpers/setup'

const jsonHeaders = { 'Content-Type': 'application/json' }

function payloadProfessor(materiaId: string, overrides: Record<string, unknown> = {}) {
  return {
    nome: 'Professor Novo',
    diasDisponiveis: ['SEG', 'QUA', 'SEX'],
    horarioInicial: '08:00',
    horarioFinal: '18:00',
    capacidadePorHorario: 4,
    corAgenda: '#4f46e5',
    materiaIds: [materiaId],
    ...overrides,
  }
}

describe('professores', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/professores', () => {
    it('lista todos os professores, sem filtro de escopo, para qualquer papel autenticado', async () => {
      await criarProfessor({ nome: 'Ana' })
      await criarProfessor({ nome: 'Bruno' })
      const { usuario, senha } = await criarUsuarioProfessor()
      const cookie = await obterCookie(usuario.email, senha)

      const response = await app.request('/api/professores', { headers: authHeader(cookie) }, testEnv)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ProfessorOutputType[]
      // 2 criados diretamente + o proprio professor do usuario autenticado.
      expect(body.length).toBe(3)
    })
  })

  describe('GET /api/professores/:id', () => {
    it('404 para id inexistente', async () => {
      const admin = await criarUsuarioAdmin()
      const cookie = await obterCookie(admin.usuario.email, admin.senha)

      const response = await app.request(
        '/api/professores/00000000-0000-0000-0000-000000000000',
        { headers: authHeader(cookie) },
        testEnv,
      )
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/professores', () => {
    it('admin cria professor vinculado a materias ativas', async () => {
      const admin = await criarUsuarioAdmin()
      const cookie = await obterCookie(admin.usuario.email, admin.senha)
      const materia = await criarMateria({ nome: 'Materia' })

      const response = await app.request(
        '/api/professores',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify(payloadProfessor(materia.id)),
        },
        testEnv,
      )

      expect(response.status).toBe(201)
      const body = (await response.json()) as ProfessorOutputType
      expect(body.materiaIds).toEqual([materia.id])
      expect(body.diasDisponiveis).toEqual(['SEG', 'QUA', 'SEX'])
    })

    it('professor autenticado nao pode criar professor -> 403', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const cookie = await obterCookie(usuario.email, senha)
      const materia = await criarMateria({ nome: 'Materia' })

      const response = await app.request(
        '/api/professores',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify(payloadProfessor(materia.id)),
        },
        testEnv,
      )
      expect(response.status).toBe(403)
    })

    it('rejeita materiaId de materia inativa -> 400', async () => {
      const admin = await criarUsuarioAdmin()
      const cookie = await obterCookie(admin.usuario.email, admin.senha)
      const materiaInativa = await criarMateria({ nome: 'Materia', ativo: false })

      const response = await app.request(
        '/api/professores',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify(payloadProfessor(materiaInativa.id)),
        },
        testEnv,
      )

      expect(response.status).toBe(400)
      const body = (await response.json()) as ApiError
      expect(body.message).toContain('inativa')
    })

    it('rejeita materiaId inexistente -> 400', async () => {
      const admin = await criarUsuarioAdmin()
      const cookie = await obterCookie(admin.usuario.email, admin.senha)

      const response = await app.request(
        '/api/professores',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify(payloadProfessor('00000000-0000-0000-0000-000000000000')),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('rejeita horarioFinal <= horarioInicial -> 400', async () => {
      const admin = await criarUsuarioAdmin()
      const cookie = await obterCookie(admin.usuario.email, admin.senha)
      const materia = await criarMateria({ nome: 'Materia' })

      const response = await app.request(
        '/api/professores',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify(
            payloadProfessor(materia.id, { horarioInicial: '18:00', horarioFinal: '08:00' }),
          ),
        },
        testEnv,
      )

      expect(response.status).toBe(400)
      const body = (await response.json()) as ApiError
      expect(body.message).toContain('horario final')
    })
  })

  describe('PUT /api/professores/:id', () => {
    it('admin edita qualquer campo, inclusive capacidadePorHorario', async () => {
      const admin = await criarUsuarioAdmin()
      const cookie = await obterCookie(admin.usuario.email, admin.senha)
      const professor = await criarProfessor()

      const response = await app.request(
        `/api/professores/${professor.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ capacidadePorHorario: 10 }),
        },
        testEnv,
      )

      expect(response.status).toBe(200)
      const body = (await response.json()) as ProfessorOutputType
      expect(body.capacidadePorHorario).toBe(10)
    })

    it('professor editando o proprio cadastro: capacidadePorHorario e descartado em silencio, resto aplica', async () => {
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const cookie = await obterCookie(usuario.email, senha)

      const response = await app.request(
        `/api/professores/${professor.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ capacidadePorHorario: 999, telefone: '11999999999' }),
        },
        testEnv,
      )

      expect(response.status).toBe(200)
      const body = (await response.json()) as ProfessorOutputType
      expect(body.capacidadePorHorario).toBe(professor.capacidadePorHorario)
      expect(body.telefone).toBe('11999999999')
    })

    it('admin enviando materiaIds vazio -> 400 (o .min(1) sobrevive ao .partial())', async () => {
      const admin = await criarUsuarioAdmin()
      const cookie = await obterCookie(admin.usuario.email, admin.senha)
      const professor = await criarProfessor()

      const response = await app.request(
        `/api/professores/${professor.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ materiaIds: [] }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('rejeita PUT que so muda horarioInicial e cria janela invertida -> 400', async () => {
      const admin = await criarUsuarioAdmin()
      const cookie = await obterCookie(admin.usuario.email, admin.senha)
      const professor = await criarProfessor({ horarioInicial: '08:00', horarioFinal: '18:00' })

      const response = await app.request(
        `/api/professores/${professor.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ horarioInicial: '19:00' }),
        },
        testEnv,
      )

      expect(response.status).toBe(400)
      const body = (await response.json()) as ApiError
      expect(body.message).toContain('horario final')
    })

    it('professor editando registro de outro professor -> 403', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const cookie = await obterCookie(usuario.email, senha)
      const outroProfessor = await criarProfessor()

      const response = await app.request(
        `/api/professores/${outroProfessor.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ telefone: '11999999999' }),
        },
        testEnv,
      )
      expect(response.status).toBe(403)
    })
  })
})
