import { beforeEach, describe, expect, it } from 'vitest'

import type { RegistroDetalheOutputType, RegistroResumoOutputType } from '../../src/server/features/registros/registros.dto'
import { VIRTUAL_REGISTRO_ID } from '../../src/shared/dto/registro.dto'
import { authHeader, obterCookie } from '../helpers/auth'
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

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

function diaSemanaDe(dataISO: string) {
  return DIAS_SEMANA[new Date(`${dataISO}T00:00:00.000Z`).getUTCDay()]
}

async function cookieAdmin() {
  const { usuario, senha } = await criarUsuarioAdmin()
  return obterCookie(usuario.email, senha)
}

/** Monta professor + aluno + materia + matricula (com estagio) + horario num dia especifico, prontos pra um registro. */
async function montarCenario(dataISO: string, estagio = 'Unidade 5', emailProfessor?: string) {
  const materia = await criarMateria({ nome: 'Materia' })
  const { usuario, professor, senha } = await criarUsuarioProfessor(
    emailProfessor ? { email: emailProfessor } : {},
  )
  const aluno = await criarAluno({ nome: 'Aluno' })
  const dia = diaSemanaDe(dataISO)
  const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })
  await prismaAtualizarEstagio(matricula.id, estagio)
  const horario = await criarHorario({ matriculaId: matricula.id, diaSemana: dia, horario: '14:00' })
  const cookie = await obterCookie(usuario.email, senha)
  return { usuario, professor, senha, cookie, aluno, materia, matricula, horario, dia }
}

// Pequeno atalho local: os testes precisam de uma matricula com `estagio`
// preenchido pra validar que o registro reflete esse valor (via relacao,
// ja que MatriculaUpdateInput nao expoe update de estagio) — mais simples
// semear via Prisma aqui mesmo.
async function prismaAtualizarEstagio(matriculaId: string, estagio: string) {
  await prisma.matricula.update({ where: { id: matriculaId }, data: { estagio } })
}

describe('registros de aula', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/registros?data=', () => {
    it('sem nenhuma linha criada -> id virtual e campos de nota todos nulos', async () => {
      const data = '2026-03-02'
      const { cookie } = await montarCenario(data)

      const response = await app.request(`/api/registros?data=${data}`, { headers: authHeader(cookie) }, testEnv)
      expect(response.status).toBe(200)
      const body = (await response.json()) as RegistroResumoOutputType[]
      expect(body.length).toBe(1)
      expect(body[0].id).toBe(VIRTUAL_REGISTRO_ID)
      expect(body[0].chegada).toBeNull()
    })

    it('nunca cria linha so por consultar a lista', async () => {
      const data = '2026-03-02'
      const { cookie } = await montarCenario(data)
      await app.request(`/api/registros?data=${data}`, { headers: authHeader(cookie) }, testEnv)

      const contagem = await prisma.registroAula.count()
      expect(contagem).toBe(0)
    })

    it('com registro criado, lista do dia reflete os campos de nota preenchidos', async () => {
      const data = '2026-03-02'
      const { cookie, horario } = await montarCenario(data)

      const criado = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ horarioId: horario.id, data, chegada: 'PRESENTE' }),
        },
        testEnv,
      )
      const registro = (await criado.json()) as RegistroDetalheOutputType

      const lista = await app.request(`/api/registros?data=${data}`, { headers: authHeader(cookie) }, testEnv)
      const body = (await lista.json()) as RegistroResumoOutputType[]
      expect(body[0].id).toBe(registro.id)
      expect(body[0].chegada).toBe('PRESENTE')
      expect(body[0].boletim).toBeNull()
    })

    it('horario inativo nao aparece na lista', async () => {
      const data = '2026-03-02'
      const { cookie, horario } = await montarCenario(data)
      await prisma.matriculaHorario.update({ where: { id: horario.id }, data: { ativo: false } })

      const response = await app.request(`/api/registros?data=${data}`, { headers: authHeader(cookie) }, testEnv)
      const body = (await response.json()) as RegistroResumoOutputType[]
      expect(body).toEqual([])
    })

    it('professor so ve os proprios horarios na lista do dia', async () => {
      const data = '2026-03-02'
      const cenarioMeu = await montarCenario(data)
      await montarCenario(data, 'Unidade 5', 'outro-professor-1@kflow.test') // outro professor, outro horario no mesmo dia

      const response = await app.request(
        `/api/registros?data=${data}`,
        { headers: authHeader(cenarioMeu.cookie) },
        testEnv,
      )
      const body = (await response.json()) as RegistroResumoOutputType[]
      expect(body.length).toBe(1)
      expect(body[0].horarioId).toBe(cenarioMeu.horario.id)
    })
  })

  describe('POST /api/registros', () => {
    it('cria o registro e reflete o estagio da matricula', async () => {
      const data = '2026-03-02'
      const { cookie, horario } = await montarCenario(data, 'Unidade 7')

      const response = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ horarioId: horario.id, data, chegada: 'PRESENTE' }),
        },
        testEnv,
      )
      expect(response.status).toBe(201)
      const body = (await response.json()) as RegistroDetalheOutputType
      expect(body.estagio).toBe('Unidade 7')
      expect(body.chegada).toBe('PRESENTE')
    })

    it('persiste boletim/foco mesmo com chegada != presente, sem checar coerencia', async () => {
      const data = '2026-03-02'
      const { cookie, horario } = await montarCenario(data)

      const response = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ horarioId: horario.id, data, chegada: 'FALTOU', boletim: 'PEGOU', foco: 'BOM' }),
        },
        testEnv,
      )
      expect(response.status).toBe(201)
      const body = (await response.json()) as RegistroDetalheOutputType
      expect(body.chegada).toBe('FALTOU')
      expect(body.boletim).toBe('PEGOU')
      expect(body.foco).toBe('BOM')
    })

    it('duplicado pro mesmo (horarioId, data) -> 409', async () => {
      const data = '2026-03-02'
      const { cookie, horario } = await montarCenario(data)
      await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ horarioId: horario.id, data }) },
        testEnv,
      )

      const resposta2 = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ horarioId: horario.id, data }) },
        testEnv,
      )
      expect(resposta2.status).toBe(409)
    })

    it('professor usando horarioId de outro professor -> 400 (referencia invalida, nao 403)', async () => {
      const data = '2026-03-02'
      const outroCenario = await montarCenario(data)
      const { cookie } = await montarCenario(data, 'Unidade 5', 'outro-professor-2@kflow.test')

      const response = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ horarioId: outroCenario.horario.id, data }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('conteudoIds inexistente -> 400', async () => {
      const data = '2026-03-02'
      const { cookie, horario } = await montarCenario(data)

      const response = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
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
      const cookie = await cookieAdmin()

      const response = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ horarioId: horario.id, data }) },
        testEnv,
      )
      expect(response.status).toBe(201)
    })
  })

  describe('PUT /api/registros/:id', () => {
    it('auto-save progressivo: cada PUT so aplica os campos enviados', async () => {
      const data = '2026-03-02'
      const { cookie, horario } = await montarCenario(data)
      const criado = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ horarioId: horario.id, data, chegada: 'PRESENTE' }) },
        testEnv,
      )
      const registro = (await criado.json()) as RegistroDetalheOutputType

      const resposta = await app.request(
        `/api/registros/${registro.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ foco: 'EXCELENTE' }) },
        testEnv,
      )
      expect(resposta.status).toBe(200)
      const body = (await resposta.json()) as RegistroDetalheOutputType
      expect(body.foco).toBe('EXCELENTE')
      expect(body.chegada).toBe('PRESENTE') // preservado
    })

    it('aceita edicao mesmo com todos os campos de nota ja preenchidos (isCompleto no front, nao no backend)', async () => {
      const data = '2026-03-02'
      const { cookie, horario } = await montarCenario(data)
      const criado = await app.request(
        '/api/registros',
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({
            horarioId: horario.id,
            data,
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
      const registro = (await criado.json()) as RegistroDetalheOutputType

      const resposta = await app.request(
        `/api/registros/${registro.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ anotacao: 'editado depois de completo' }) },
        testEnv,
      )
      expect(resposta.status).toBe(200)
      const body = (await resposta.json()) as RegistroDetalheOutputType
      expect(body.anotacao).toBe('editado depois de completo')
    })

    it('outro professor nao acessa o registro (404)', async () => {
      const data = '2026-03-02'
      const dono = await montarCenario(data)
      const outro = await montarCenario(data, 'Unidade 5', 'outro-professor-3@kflow.test')
      const criado = await app.request(
        '/api/registros',
        { method: 'POST', headers: { ...jsonHeaders, ...authHeader(dono.cookie) }, body: JSON.stringify({ horarioId: dono.horario.id, data }) },
        testEnv,
      )
      const registro = (await criado.json()) as RegistroDetalheOutputType

      const resposta = await app.request(
        `/api/registros/${registro.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(outro.cookie) }, body: JSON.stringify({ anotacao: 'x' }) },
        testEnv,
      )
      expect(resposta.status).toBe(404)
    })
  })
})
