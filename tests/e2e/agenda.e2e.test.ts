import { beforeEach, describe, expect, it } from 'vitest'

import type { AgendaSlotOutputType } from '../../src/server/features/agenda/agenda.dto'
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
import { app, prisma, resetDb, testEnv } from '../helpers/setup'

async function cookieAdmin() {
  const { usuario, senha } = await criarUsuarioAdmin()
  return obterCookie(usuario.email, senha)
}

async function montarSlot(professorId: string) {
  const materia = await criarMateria({ nome: 'Materia' })
  const aluno = await criarAluno({ nome: 'Aluno' })
  const matricula = await criarMatricula({ alunoId: aluno.id, professorId, materiaId: materia.id })
  const horario = await criarHorario({ matriculaId: matricula.id, diaSemana: 'SEG', horario: '10:00' })
  return { aluno, materia, matricula, horario }
}

describe('agenda', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/agenda', () => {
    it('admin sem professorId ve a agenda inteira', async () => {
      const professor1 = await criarProfessor()
      const professor2 = await criarProfessor()
      await montarSlot(professor1.id)
      await montarSlot(professor2.id)

      const cookie = await cookieAdmin()
      const response = await app.request('/api/agenda', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as AgendaSlotOutputType[]
      expect(body.length).toBe(2)
    })

    it('admin com ?professorId= filtra por aquele professor', async () => {
      const professor1 = await criarProfessor()
      const professor2 = await criarProfessor()
      await montarSlot(professor1.id)
      await montarSlot(professor2.id)

      const cookie = await cookieAdmin()
      const response = await app.request(
        `/api/agenda?professorId=${professor1.id}`,
        { headers: authHeader(cookie) },
        testEnv,
      )
      const body = (await response.json()) as AgendaSlotOutputType[]
      expect(body.length).toBe(1)
      expect(body[0].professorId).toBe(professor1.id)
    })

    it('professor autenticado sempre ve so a propria agenda, mesmo pedindo professorId de outro', async () => {
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()
      await montarSlot(professor.id)
      await montarSlot(outroProfessor.id)

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(
        `/api/agenda?professorId=${outroProfessor.id}`,
        { headers: authHeader(cookie) },
        testEnv,
      )
      const body = (await response.json()) as AgendaSlotOutputType[]
      expect(body.length).toBe(1)
      expect(body[0].professorId).toBe(professor.id)
    })

    it('so retorna horarios ativos', async () => {
      const professor = await criarProfessor()
      const { horario } = await montarSlot(professor.id)
      await prisma.matriculaHorario.update({ where: { id: horario.id }, data: { ativo: false } })

      const cookie = await cookieAdmin()
      const response = await app.request(
        `/api/agenda?professorId=${professor.id}`,
        { headers: authHeader(cookie) },
        testEnv,
      )
      const body = (await response.json()) as AgendaSlotOutputType[]
      expect(body).toEqual([])
    })
  })

  describe('GET /api/alunos/:id/agenda', () => {
    it('admin ve a agenda completa do aluno, mesmo com professores diferentes', async () => {
      const professor1 = await criarProfessor()
      const professor2 = await criarProfessor()
      const aluno = await criarAluno({ nome: 'Aluno' })
      const materia1 = await criarMateria({ nome: 'Materia 1' })
      const materia2 = await criarMateria({ nome: 'Materia 2' })
      const matricula1 = await criarMatricula({ alunoId: aluno.id, professorId: professor1.id, materiaId: materia1.id })
      const matricula2 = await criarMatricula({ alunoId: aluno.id, professorId: professor2.id, materiaId: materia2.id })
      await criarHorario({ matriculaId: matricula1.id })
      await criarHorario({ matriculaId: matricula2.id, diaSemana: 'QUA' })

      const cookie = await cookieAdmin()
      const response = await app.request(`/api/alunos/${aluno.id}/agenda`, { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as AgendaSlotOutputType[]
      expect(body.length).toBe(2)
    })

    it('professor so ve os proprios horarios daquele aluno', async () => {
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()
      const aluno = await criarAluno({ nome: 'Aluno' })
      const materia1 = await criarMateria({ nome: 'Materia 1' })
      const materia2 = await criarMateria({ nome: 'Materia 2' })
      const minha = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia1.id })
      const deOutro = await criarMatricula({ alunoId: aluno.id, professorId: outroProfessor.id, materiaId: materia2.id })
      await criarHorario({ matriculaId: minha.id })
      await criarHorario({ matriculaId: deOutro.id, diaSemana: 'QUA' })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(`/api/alunos/${aluno.id}/agenda`, { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as AgendaSlotOutputType[]
      expect(body.length).toBe(1)
      expect(body[0].professorId).toBe(professor.id)
    })

    it('aluno que nao pertence ao professor devolve lista vazia, nunca 404', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()
      const { aluno } = await montarSlot(outroProfessor.id)

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(`/api/alunos/${aluno.id}/agenda`, { headers: authHeader(cookie) }, testEnv)
      expect(response.status).toBe(200)
      const body = (await response.json()) as AgendaSlotOutputType[]
      expect(body).toEqual([])
    })
  })
})
