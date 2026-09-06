import { beforeEach, describe, expect, it } from 'vitest'

import type { HistoricoAcompanhamentoOutputType } from '../../src/shared/dto/historico.dto'
import { authHeader, obterCookie } from '../helpers/auth'
import {
  criarAluno,
  criarHorario,
  criarMateria,
  criarMatricula,
  criarProfessor,
  criarUsuarioAdmin,
} from '../helpers/factories'
import { app, resetDb, testEnv } from '../helpers/setup'

const jsonHeaders = { 'Content-Type': 'application/json' }
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function diaSemanaDeHoje() {
  return DIAS_SEMANA[new Date().getUTCDay()]
}

async function cookieAdmin() {
  const { usuario, senha } = await criarUsuarioAdmin()
  return obterCookie(usuario.email, senha)
}

describe('GET /api/alunos/:alunoId/registros/historico', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('previstas/realizadas refletem os horarios ativos e os registros do periodo "DIA"', async () => {
    const professor = await criarProfessor()
    const materia = await criarMateria({ nome: 'Materia' })
    const aluno = await criarAluno({ nome: 'Aluno' })
    const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })
    const horario = await criarHorario({ matriculaId: matricula.id, diaSemana: diaSemanaDeHoje(), horario: '14:00' })

    const cookie = await cookieAdmin()

    await app.request(
      '/api/registros',
      {
        method: 'POST',
        headers: { ...jsonHeaders, ...authHeader(cookie) },
        body: JSON.stringify({
          horarioId: horario.id,
          data: hojeISO(),
          chegada: 'PRESENTE',
          boletim: 'PEGOU',
          atividadeCasa: 'FEZ',
          foco: 'BOM',
          autonomia: 'BOA',
          comportamento: 'ADEQUADO',
          desempenho: 'BOM',
        }),
      },
      testEnv,
    )

    const response = await app.request(
      `/api/alunos/${aluno.id}/registros/historico?periodo=DIA`,
      { headers: authHeader(cookie) },
      testEnv,
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as HistoricoAcompanhamentoOutputType

    expect(body.previstas).toBe(1)
    expect(body.realizadas).toBe(1)
    expect(body.presencaPercentual).toBe(100)
    expect(body.mediaFoco).toBe(3)
    expect(body.mediaAutonomia).toBe(3)
    expect(body.mediaComportamento).toBe(3)
    expect(body.mediaDesempenho).toBe(3)
  })

  it('sem nenhum registro no periodo -> zeros e medias nulas', async () => {
    const professor = await criarProfessor()
    const materia = await criarMateria({ nome: 'Materia' })
    const aluno = await criarAluno({ nome: 'Aluno' })
    const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })
    await criarHorario({ matriculaId: matricula.id, diaSemana: diaSemanaDeHoje(), horario: '14:00' })

    const cookie = await cookieAdmin()
    const response = await app.request(
      `/api/alunos/${aluno.id}/registros/historico?periodo=DIA`,
      { headers: authHeader(cookie) },
      testEnv,
    )
    const body = (await response.json()) as HistoricoAcompanhamentoOutputType

    expect(body.previstas).toBe(1)
    expect(body.realizadas).toBe(0)
    expect(body.presencaPercentual).toBe(0)
    expect(body.mediaFoco).toBeNull()
    expect(body.evolucao.foco).toBeNull()
  })

  it('sem token -> 401', async () => {
    const aluno = await criarAluno({ nome: 'Aluno' })
    const response = await app.request(
      `/api/alunos/${aluno.id}/registros/historico?periodo=DIA`,
      {},
      testEnv,
    )
    expect(response.status).toBe(401)
  })

  it('periodo invalido -> 400', async () => {
    const aluno = await criarAluno({ nome: 'Aluno' })
    const cookie = await cookieAdmin()
    const response = await app.request(
      `/api/alunos/${aluno.id}/registros/historico?periodo=ANO`,
      { headers: authHeader(cookie) },
      testEnv,
    )
    expect(response.status).toBe(400)
  })
})
