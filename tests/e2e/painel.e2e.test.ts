import { beforeEach, describe, expect, it } from 'vitest'

import type { PainelOutputType } from '../../src/server/features/painel/painel.dto'
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
    it('admin ve agregacoes da unidade inteira', async () => {
      const professor1 = await criarProfessor()
      const professor2 = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })
      const aluno1 = await criarAluno({ nome: 'Aluno 1' })
      const aluno2 = await criarAluno({ nome: 'Aluno 2' })
      const matricula1 = await criarMatricula({ alunoId: aluno1.id, professorId: professor1.id, materiaId: materia.id })
      const matricula2 = await criarMatricula({ alunoId: aluno2.id, professorId: professor2.id, materiaId: materia.id })
      await criarHorario({ matriculaId: matricula1.id, diaSemana: 'SEG' })
      await criarHorario({ matriculaId: matricula2.id, diaSemana: 'TER' })

      const cookie = await cookieAdmin()
      const response = await app.request('/api/painel', { headers: authHeader(cookie) }, testEnv)
      expect(response.status).toBe(200)
      const body = (await response.json()) as PainelOutputType

      expect(body.totalAlunosAtivos).toBe(2)
      expect(body.totalMatriculasAtivas).toBe(2)
      expect(body.totalProfessores).toBe(2)
      expect(body.matriculasPorMateria).toEqual([
        { materiaId: materia.id, materiaNome: materia.nome, total: 2 },
      ])
      expect(body.aulasPorDiaSemana.length).toBe(7) // todos os 7 dias, mesmo com total 0
      const segunda = body.aulasPorDiaSemana.find((d) => d.diaSemana === 'SEG')
      expect(segunda?.total).toBe(1)
    })

    it('professor ve so as proprias agregacoes, mas totalProfessores continua sendo da unidade inteira', async () => {
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })

      const meuAluno = await criarAluno({ nome: 'Meu Aluno' })
      const matriculaMinha = await criarMatricula({ alunoId: meuAluno.id, professorId: professor.id, materiaId: materia.id })
      await criarHorario({ matriculaId: matriculaMinha.id })

      const alunoDeOutro = await criarAluno({ nome: 'Aluno de Outro' })
      const matriculaDeOutro = await criarMatricula({ alunoId: alunoDeOutro.id, professorId: outroProfessor.id, materiaId: materia.id })
      await criarHorario({ matriculaId: matriculaDeOutro.id })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request('/api/painel', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as PainelOutputType

      expect(body.totalAlunosAtivos).toBe(1)
      expect(body.totalMatriculasAtivas).toBe(1)
      // GET /professores (PR 03) ja e um diretorio nao-escopado — mesma logica aqui.
      expect(body.totalProfessores).toBe(2)
    })

    it('alertas trazem so alunos em zona vermelha dentro do escopo', async () => {
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })

      const meuAlunoVermelho = await criarAluno({ nome: 'Aluno Vermelho' })
      await prisma.aluno.update({ where: { id: meuAlunoVermelho.id }, data: { zonaVermelha: true } })
      const matriculaMinha = await criarMatricula({ alunoId: meuAlunoVermelho.id, professorId: professor.id, materiaId: materia.id })
      await criarHorario({ matriculaId: matriculaMinha.id })

      const alunoVermelhoDeOutro = await criarAluno({ nome: 'Vermelho de Outro' })
      await prisma.aluno.update({ where: { id: alunoVermelhoDeOutro.id }, data: { zonaVermelha: true } })
      const matriculaDeOutro = await criarMatricula({ alunoId: alunoVermelhoDeOutro.id, professorId: outroProfessor.id, materiaId: materia.id })
      await criarHorario({ matriculaId: matriculaDeOutro.id })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request('/api/painel', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as PainelOutputType

      expect(body.alertas.length).toBe(1)
      expect(body.alertas[0].alunoId).toBe(meuAlunoVermelho.id)
      expect(body.alertas[0].tipo).toBe('zona_vermelha')
    })

    it('ocupacaoPercentual e 0 quando nao ha capacidade nem horarios', async () => {
      const cookie = await cookieAdmin()
      const response = await app.request('/api/painel', { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as PainelOutputType
      expect(body.ocupacaoPercentual).toBe(0)
    })

    it('sem token -> 401', async () => {
      const response = await app.request('/api/painel', {}, testEnv)
      expect(response.status).toBe(401)
    })
  })
})
