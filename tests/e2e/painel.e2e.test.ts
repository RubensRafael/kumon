import { beforeEach, describe, expect, it } from 'vitest'

import type { PainelDadosOutputType } from '../../src/shared/dto/painel.dto'
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

describe('painel', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/painel', () => {
    it('devolve o snapshot bruto da unidade inteira, sem agregacao', async () => {
      const professor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })
      const aluno = await criarAluno({ nome: 'Aluno' })
      const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })
      const horario = await criarHorario({ matriculaId: matricula.id, diaSemana: 'SEG' })

      const cookie = await cookieAdmin()
      const response = await app.request('/api/painel', { headers: authHeader(cookie) }, testEnv)
      expect(response.status).toBe(200)
      const body = (await response.json()) as PainelDadosOutputType

      expect(body.professores).toEqual([expect.objectContaining({ id: professor.id })])
      expect(body.alunos).toEqual([expect.objectContaining({ id: aluno.id, situacao: 'ATIVO' })])
      expect(body.materias).toEqual([expect.objectContaining({ id: materia.id, conteudos: [] })])
      expect(body.matriculas).toEqual([
        expect.objectContaining({
          id: matricula.id,
          horarios: [expect.objectContaining({ id: horario.id, diaSemana: 'SEG' })],
        }),
      ])
    })

    it('professor autenticado ve o snapshot inteiro, nao so os proprios dados — e so leitura', async () => {
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })
      const meuAluno = await criarAluno({ nome: 'Meu Aluno' })
      const alunoDeOutro = await criarAluno({ nome: 'Aluno de Outro' })
      await criarMatricula({ alunoId: meuAluno.id, professorId: professor.id, materiaId: materia.id })
      await criarMatricula({ alunoId: alunoDeOutro.id, professorId: outroProfessor.id, materiaId: materia.id })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request('/api/painel', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as PainelDadosOutputType

      expect(body.professores.length).toBe(2)
      expect(body.alunos.length).toBe(2)
      expect(body.matriculas.length).toBe(2)
    })

    it('so traz horarios ativos dentro de cada matricula', async () => {
      const professor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })
      const aluno = await criarAluno({ nome: 'Aluno' })
      const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })
      const horario = await criarHorario({ matriculaId: matricula.id })
      await prisma.matriculaHorario.update({ where: { id: horario.id }, data: { ativo: false } })

      const cookie = await cookieAdmin()
      const response = await app.request('/api/painel', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as PainelDadosOutputType

      expect(body.matriculas[0]?.horarios).toEqual([])
    })

    it('sem token -> 401', async () => {
      const response = await app.request('/api/painel', {}, testEnv)
      expect(response.status).toBe(401)
    })
  })
})
