import { beforeEach, describe, expect, it } from 'vitest'

import type { HorarioOutputType } from '../../src/server/features/horarios/horarios.dto'
import { authHeader, obterCookie } from '../helpers/auth'
import {
  criarAluno,
  criarHorario,
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

async function novaMatricula(professorId: string) {
  const aluno = await criarAluno({ nome: 'Aluno' })
  const materia = await criarMateria({ nome: 'Materia' })
  return criarMatricula({ alunoId: aluno.id, professorId, materiaId: materia.id })
}

describe('horarios', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/matriculas/:matriculaId/horarios', () => {
    it('professor dono da matricula ve os horarios', async () => {
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const matricula = await novaMatricula(professor.id)
      await criarHorario({ matriculaId: matricula.id, diaSemana: 'SEG', horario: '14:00' })
      await criarHorario({ matriculaId: matricula.id, diaSemana: 'QUA', horario: '15:00' })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(
        `/api/matriculas/${matricula.id}/horarios`,
        { headers: authHeader(cookie) },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as HorarioOutputType[]
      expect(body.length).toBe(2)
    })

    it('professor que nao e dono da matricula recebe 404 (matricula "nao existe" pra ele)', async () => {
      const outroProfessor = await criarProfessor()
      const matricula = await novaMatricula(outroProfessor.id)
      await criarHorario({ matriculaId: matricula.id })

      const { usuario, senha } = await criarUsuarioProfessor()
      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(
        `/api/matriculas/${matricula.id}/horarios`,
        { headers: authHeader(cookie) },
        testEnv,
      )
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/matriculas/:matriculaId/horarios', () => {
    it('admin cria horario', async () => {
      const cookie = await cookieAdmin()
      const professor = await criarProfessor()
      const matricula = await novaMatricula(professor.id)

      const response = await app.request(
        `/api/matriculas/${matricula.id}/horarios`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ diaSemana: 'SEX', horario: '16:00' }),
        },
        testEnv,
      )
      expect(response.status).toBe(201)
      const body = (await response.json()) as HorarioOutputType
      expect(body.diaSemana).toBe('SEX')
      expect(body.ativo).toBe(true)
    })

    it('rejeita horario duplicado (mesma matricula+dia+hora, ambos ativos) -> 409', async () => {
      const cookie = await cookieAdmin()
      const professor = await criarProfessor()
      const matricula = await novaMatricula(professor.id)
      await criarHorario({ matriculaId: matricula.id, diaSemana: 'TER', horario: '10:00' })

      const response = await app.request(
        `/api/matriculas/${matricula.id}/horarios`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ diaSemana: 'TER', horario: '10:00' }),
        },
        testEnv,
      )
      expect(response.status).toBe(409)
    })

    it('permite recriar o mesmo dia/hora depois que o antigo foi desativado', async () => {
      const cookie = await cookieAdmin()
      const professor = await criarProfessor()
      const matricula = await novaMatricula(professor.id)
      const antigo = await criarHorario({ matriculaId: matricula.id, diaSemana: 'QUI', horario: '09:00' })

      await app.request(
        `/api/horarios/${antigo.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ ativo: false }) },
        testEnv,
      )

      const response = await app.request(
        `/api/matriculas/${matricula.id}/horarios`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ diaSemana: 'QUI', horario: '09:00' }),
        },
        testEnv,
      )
      expect(response.status).toBe(201)
    })

    it('rejeita horario fora do formato HH:mm em intervalos de 30 min -> 400', async () => {
      const cookie = await cookieAdmin()
      const professor = await criarProfessor()
      const matricula = await novaMatricula(professor.id)

      const response = await app.request(
        `/api/matriculas/${matricula.id}/horarios`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ diaSemana: 'SEX', horario: '16:15' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('professor autenticado nao pode criar horario -> 403', async () => {
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const matricula = await novaMatricula(professor.id)
      const cookie = await obterCookie(usuario.email, senha)

      const response = await app.request(
        `/api/matriculas/${matricula.id}/horarios`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ diaSemana: 'SEG', horario: '10:00' }),
        },
        testEnv,
      )
      expect(response.status).toBe(403)
    })
  })

  describe('PUT /api/horarios/:id', () => {
    it('desativa via ativo:false', async () => {
      const cookie = await cookieAdmin()
      const professor = await criarProfessor()
      const matricula = await novaMatricula(professor.id)
      const horario = await criarHorario({ matriculaId: matricula.id })

      const response = await app.request(
        `/api/horarios/${horario.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ ativo: false }) },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as HorarioOutputType
      expect(body.ativo).toBe(false)
    })

    it('diaSemana no corpo e descartado em silencio, sem erro', async () => {
      const cookie = await cookieAdmin()
      const professor = await criarProfessor()
      const matricula = await novaMatricula(professor.id)
      const horario = await criarHorario({ matriculaId: matricula.id, diaSemana: 'SEG' })

      const response = await app.request(
        `/api/horarios/${horario.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ diaSemana: 'SEX', ativo: true }),
        },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as HorarioOutputType
      expect(body.diaSemana).toBe('SEG')
    })
  })
})
