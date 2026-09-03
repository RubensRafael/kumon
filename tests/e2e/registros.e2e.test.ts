import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RegistroDetalheOutputType, RegistroResumoOutputType } from '../../src/server/features/registros/registros.dto'
import { authHeader, obterToken } from '../helpers/auth'
import {
  criarAluno,
  criarHorario,
  criarMateria,
  criarMatricula,
  criarUsuarioAdmin,
  criarUsuarioProfessor,
} from '../helpers/factories'
import { app, prisma, resetDb, testEnv } from '../helpers/setup'

const jsonHeaders = { 'Content-Type': 'application/json' }

const DIAS_API = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const
const DIAS_BANCO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

function diaSemanaDe(dataISO: string) {
  const indice = new Date(`${dataISO}T00:00:00.000Z`).getUTCDay()
  return { api: DIAS_API[indice], banco: DIAS_BANCO[indice] }
}

async function tokenAdmin() {
  const { usuario, senha } = await criarUsuarioAdmin()
  return obterToken(usuario.email, senha)
}

/** Monta professor + aluno + materia + matricula (com estagio) + horario num dia especifico, prontos pra um registro. */
async function montarCenario(dataISO: string, estagio = 'Unidade 5') {
  const materia = await criarMateria()
  const { usuario, professor, senha } = await criarUsuarioProfessor()
  const aluno = await criarAluno()
  const dia = diaSemanaDe(dataISO)
  const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })
  await prismaAtualizarEstagio(matricula.id, estagio)
  const horario = await criarHorario({ matriculaId: matricula.id, diaSemana: dia.banco, horario: '14:00' })
  const token = await obterToken(usuario.email, senha)
  return { usuario, professor, senha, token, aluno, materia, matricula, horario, dia }
}

// Pequeno atalho local: os testes precisam de uma matricula com `estagio`
// preenchido pra validar o snapshot automatico, e a feature de matriculas
// (PR 06) nao expoe update de estagio junto com outros campos de forma
// direta o bastante — mais simples semear via Prisma aqui mesmo.
async function prismaAtualizarEstagio(matriculaId: string, estagio: string) {
  await prisma.matricula.update({ where: { id: matriculaId }, data: { estagio } })
}

describe('registros de aula', () => {
  beforeEach(async () => {
    await resetDb()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('GET /api/registros?data=', () => {
    it('sem nenhuma linha criada -> id null e status nao_iniciado', async () => {
      const data = '2026-03-02'
      const { token } = await montarCenario(data)

      const response = await app.request(`/api/registros?data=${data}`, { headers: authHeader(token) }, testEnv)
      expect(response.status).toBe(200)
      const body = (await response.json()) as RegistroResumoOutputType[]
      expect(body.length).toBe(1)
      expect(body[0].id).toBeNull()
      expect(body[0].status).toBe('nao_iniciado')
    })

    it('nunca cria linha so por consultar a lista', async () => {
      const data = '2026-03-02'
      const { token } = await montarCenario(data)
      await app.request(`/api/registros?data=${data}`, { headers: authHeader(token) }, testEnv)

      const contagem = await prisma.registroAula.count()
      expect(contagem).toBe(0)
    })

    it('com registro aberto -> em_andamento; apos finalizar -> concluido', async () => {
      const data = '2026-03-02'
      const { token, horario } = await montarCenario(data)

      const criado = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ horarioId: horario.id, data, chegada: 'presente' }),
        },
        testEnv,
      )
      const registro = (await criado.json()) as RegistroDetalheOutputType

      const listaAberta = await app.request(`/api/registros?data=${data}`, { headers: authHeader(token) }, testEnv)
      const bodyAberta = (await listaAberta.json()) as RegistroResumoOutputType[]
      expect(bodyAberta[0].id).toBe(registro.id)
      expect(bodyAberta[0].status).toBe('em_andamento')

      await app.request(`/api/registros/${registro.id}/finalizar`, { method: 'POST', headers: authHeader(token) }, testEnv)

      const listaFechada = await app.request(`/api/registros?data=${data}`, { headers: authHeader(token) }, testEnv)
      const bodyFechada = (await listaFechada.json()) as RegistroResumoOutputType[]
      expect(bodyFechada[0].status).toBe('concluido')
    })

    it('horario inativo nao aparece na lista', async () => {
      const data = '2026-03-02'
      const { token, horario } = await montarCenario(data)
      await prisma.matriculaHorario.update({ where: { id: horario.id }, data: { ativo: false } })

      const response = await app.request(`/api/registros?data=${data}`, { headers: authHeader(token) }, testEnv)
      const body = (await response.json()) as RegistroResumoOutputType[]
      expect(body).toEqual([])
    })

    it('professor so ve os proprios horarios na lista do dia', async () => {
      const data = '2026-03-02'
      const cenarioMeu = await montarCenario(data)
      await montarCenario(data) // outro professor, outro horario no mesmo dia

      const response = await app.request(
        `/api/registros?data=${data}`,
        { headers: authHeader(cenarioMeu.token) },
        testEnv,
      )
      const body = (await response.json()) as RegistroResumoOutputType[]
      expect(body.length).toBe(1)
      expect(body[0].horarioId).toBe(cenarioMeu.horario.id)
    })
  })

  describe('POST /api/registros', () => {
    it('cria o registro e copia estagio da matricula automaticamente', async () => {
      const data = '2026-03-02'
      const { token, horario } = await montarCenario(data, 'Unidade 7')

      const response = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ horarioId: horario.id, data, chegada: 'presente' }),
        },
        testEnv,
      )
      expect(response.status).toBe(201)
      const body = (await response.json()) as RegistroDetalheOutputType
      expect(body.estagio).toBe('Unidade 7')
      expect(body.fechado).toBe(false)
      expect(body.status).toBe('em_andamento')
    })

    it('persiste boletim/foco mesmo com chegada != presente, sem checar coerencia', async () => {
      const data = '2026-03-02'
      const { token, horario } = await montarCenario(data)

      const response = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ horarioId: horario.id, data, chegada: 'faltou', boletim: 'pegou', foco: 'bom' }),
        },
        testEnv,
      )
      expect(response.status).toBe(201)
      const body = (await response.json()) as RegistroDetalheOutputType
      expect(body.chegada).toBe('faltou')
      expect(body.boletim).toBe('pegou')
      expect(body.foco).toBe('bom')
    })

    it('duplicado pro mesmo (horarioId, data) -> 409', async () => {
      const data = '2026-03-02'
      const { token, horario } = await montarCenario(data)
      await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ horarioId: horario.id, data }) },
        testEnv,
      )

      const resposta2 = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ horarioId: horario.id, data }) },
        testEnv,
      )
      expect(resposta2.status).toBe(409)
    })

    it('professor usando horarioId de outro professor -> 400 (referencia invalida, nao 403)', async () => {
      const data = '2026-03-02'
      const outroCenario = await montarCenario(data)
      const { token } = await montarCenario(data)

      const response = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ horarioId: outroCenario.horario.id, data }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('conteudoIds inexistente -> 400', async () => {
      const data = '2026-03-02'
      const { token, horario } = await montarCenario(data)

      const response = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({
            horarioId: horario.id,
            data,
            conteudoIds: ['00000000-0000-0000-0000-000000000000'],
          }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('admin cria registro em qualquer horario', async () => {
      const data = '2026-03-02'
      const { horario } = await montarCenario(data)
      const token = await tokenAdmin()

      const response = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ horarioId: horario.id, data }) },
        testEnv,
      )
      expect(response.status).toBe(201)
    })
  })

  describe('PUT /api/registros/:id', () => {
    it('auto-save progressivo: cada PUT so aplica os campos enviados', async () => {
      const data = '2026-03-02'
      const { token, horario } = await montarCenario(data)
      const criado = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ horarioId: horario.id, data, chegada: 'presente' }) },
        testEnv,
      )
      const registro = (await criado.json()) as RegistroDetalheOutputType

      const resposta = await app.request(
        `/api/registros/${registro.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ foco: 'excelente' }) },
        testEnv,
      )
      expect(resposta.status).toBe(200)
      const body = (await resposta.json()) as RegistroDetalheOutputType
      expect(body.foco).toBe('excelente')
      expect(body.chegada).toBe('presente') // preservado
    })

    it('nao bloqueia editar um registro ja fechado', async () => {
      const data = '2026-03-02'
      const { token, horario } = await montarCenario(data)
      const criado = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ horarioId: horario.id, data }) },
        testEnv,
      )
      const registro = (await criado.json()) as RegistroDetalheOutputType
      await app.request(`/api/registros/${registro.id}/finalizar`, { method: 'POST', headers: authHeader(token) }, testEnv)

      const resposta = await app.request(
        `/api/registros/${registro.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ anotacao: 'editado depois de fechado' }) },
        testEnv,
      )
      expect(resposta.status).toBe(200)
      const body = (await resposta.json()) as RegistroDetalheOutputType
      expect(body.anotacao).toBe('editado depois de fechado')
    })

    it('outro professor nao acessa o registro (404)', async () => {
      const data = '2026-03-02'
      const dono = await montarCenario(data)
      const outro = await montarCenario(data)
      const criado = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(dono.token) }, body: JSON.stringify({ horarioId: dono.horario.id, data }) },
        testEnv,
      )
      const registro = (await criado.json()) as RegistroDetalheOutputType

      const resposta = await app.request(
        `/api/registros/${registro.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(outro.token) }, body: JSON.stringify({ anotacao: 'x' }) },
        testEnv,
      )
      expect(resposta.status).toBe(404)
    })
  })

  describe('POST /api/registros/:id/finalizar', () => {
    it('grava horaFim e duracaoMin, e e idempotente (2a chamada nao recalcula)', async () => {
      const data = '2026-03-02'
      // So o relogio (`Date`) e mockado — `setTimeout`/event loop seguem reais,
      // senao o I/O de verdade contra o Postgres (via `pg`) trava.
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-03-02T14:00:00.000Z'))

      const { token, horario } = await montarCenario(data)
      const criado = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ horarioId: horario.id, data }) },
        testEnv,
      )
      const registro = (await criado.json()) as RegistroDetalheOutputType

      vi.setSystemTime(new Date('2026-03-02T14:05:00.000Z'))
      const primeira = await app.request(`/api/registros/${registro.id}/finalizar`, { method: 'POST', headers: authHeader(token) }, testEnv)
      const primeiroBody = (await primeira.json()) as RegistroDetalheOutputType
      expect(primeiroBody.fechado).toBe(true)
      expect(primeiroBody.duracaoMin).toBe(5)
      expect(primeiroBody.status).toBe('concluido')

      vi.setSystemTime(new Date('2026-03-02T14:20:00.000Z'))
      const segunda = await app.request(`/api/registros/${registro.id}/finalizar`, { method: 'POST', headers: authHeader(token) }, testEnv)
      const segundoBody = (await segunda.json()) as RegistroDetalheOutputType
      expect(segundoBody.duracaoMin).toBe(5) // nao virou 20
    })
  })
})
