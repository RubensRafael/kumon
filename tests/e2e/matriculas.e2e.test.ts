import { beforeEach, describe, expect, it } from 'vitest'

import type { MatriculaOutputType } from '../../src/server/features/matriculas/matriculas.dto'
import { authHeader, obterCookie } from '../helpers/auth'
import {
  criarAluno,
  criarMateria,
  criarMatricula,
  criarProfessor,
  criarUsuarioAdmin,
  criarUsuarioProfessor,
} from '../helpers/factories'
import { app, prisma, resetDb, testEnv } from '../helpers/setup'

const jsonHeaders = { 'Content-Type': 'application/json' }

async function cookieAdmin() {
  const { usuario, senha } = await criarUsuarioAdmin()
  return obterCookie(usuario.email, senha)
}

describe('matriculas', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/alunos/:alunoId/matriculas', () => {
    it('professor so ve as proprias matriculas do aluno', async () => {
      const materia = await criarMateria({ nome: 'Materia' })
      const aluno = await criarAluno({ nome: 'Aluno' })
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()

      const minha = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })
      const materia2 = await criarMateria({ nome: 'Materia 2' })
      await criarMatricula({ alunoId: aluno.id, professorId: outroProfessor.id, materiaId: materia2.id })

      const cookie = await obterCookie(usuario.email, senha)
      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        { headers: authHeader(cookie) },
        testEnv,
      )
      const body = (await response.json()) as MatriculaOutputType[]
      expect(body.map((m) => m.id)).toEqual([minha.id])
    })

    it('admin ve todas as matriculas do aluno', async () => {
      const materia1 = await criarMateria({ nome: 'Materia 1' })
      const materia2 = await criarMateria({ nome: 'Materia 2' })
      const aluno = await criarAluno({ nome: 'Aluno' })
      const professor1 = await criarProfessor()
      const professor2 = await criarProfessor()
      await criarMatricula({ alunoId: aluno.id, professorId: professor1.id, materiaId: materia1.id })
      await criarMatricula({ alunoId: aluno.id, professorId: professor2.id, materiaId: materia2.id })

      const cookie = await cookieAdmin()
      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        { headers: authHeader(cookie) },
        testEnv,
      )
      const body = (await response.json()) as MatriculaOutputType[]
      expect(body.length).toBe(2)
    })
  })

  describe('POST /api/alunos/:alunoId/matriculas', () => {
    it('cria matricula sem herdar horarios de nenhuma outra', async () => {
      const cookie = await cookieAdmin()
      const aluno = await criarAluno({ nome: 'Aluno' })
      const professor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })

      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ professorId: professor.id, materiaId: materia.id, tipoAtendimento: 'REGULAR' }),
        },
        testEnv,
      )

      expect(response.status).toBe(201)
      const body = (await response.json()) as MatriculaOutputType
      expect(body.situacao).toBe('ATIVA')

      const horarios = await prisma.matriculaHorario.count({ where: { matriculaId: body.id } })
      expect(horarios).toBe(0)
    })

    it('rejeita segunda matricula ativa do mesmo aluno na mesma materia -> 400', async () => {
      const cookie = await cookieAdmin()
      const aluno = await criarAluno({ nome: 'Aluno' })
      const professor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })
      await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })

      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ professorId: professor.id, materiaId: materia.id, tipoAtendimento: 'REGULAR' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('permite nova matricula ativa depois que a antiga foi encerrada (fluxo de troca)', async () => {
      const cookie = await cookieAdmin()
      const aluno = await criarAluno({ nome: 'Aluno' })
      const professorAntigo = await criarProfessor()
      const professorNovo = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })
      const antiga = await criarMatricula({ alunoId: aluno.id, professorId: professorAntigo.id, materiaId: materia.id })

      const encerrar = await app.request(
        `/api/matriculas/${antiga.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(cookie) }, body: JSON.stringify({ situacao: 'ENCERRADA' }) },
        testEnv,
      )
      expect(encerrar.status).toBe(200)

      const nova = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ professorId: professorNovo.id, materiaId: materia.id, tipoAtendimento: 'REGULAR' }),
        },
        testEnv,
      )
      expect(nova.status).toBe(201)
    })

    it('rejeita materia inativa -> 400', async () => {
      const cookie = await cookieAdmin()
      const aluno = await criarAluno({ nome: 'Aluno' })
      const professor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia', ativo: false })

      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ professorId: professor.id, materiaId: materia.id, tipoAtendimento: 'REGULAR' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('professor autenticado nao pode criar matricula -> 403', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const cookie = await obterCookie(usuario.email, senha)
      const aluno = await criarAluno({ nome: 'Aluno' })
      const professor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })

      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ professorId: professor.id, materiaId: materia.id, tipoAtendimento: 'REGULAR' }),
        },
        testEnv,
      )
      expect(response.status).toBe(403)
    })
  })

  describe('PUT /api/matriculas/:id', () => {
    it('atualiza situacao/observacoes normalmente', async () => {
      const cookie = await cookieAdmin()
      const aluno = await criarAluno({ nome: 'Aluno' })
      const professor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })
      const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })

      const response = await app.request(
        `/api/matriculas/${matricula.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({ observacoes: 'Nota qualquer', situacao: 'PAUSADA' }),
        },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as MatriculaOutputType
      expect(body.observacoes).toBe('Nota qualquer')
      expect(body.situacao).toBe('PAUSADA')
    })

    it('professorId/materiaId/tipoAtendimento/estagio no corpo sao ignorados em silencio (nao existem em MatriculaUpdateInput)', async () => {
      const cookie = await cookieAdmin()
      const aluno = await criarAluno({ nome: 'Aluno' })
      const professor = await criarProfessor()
      const outroProfessor = await criarProfessor()
      const materia = await criarMateria({ nome: 'Materia' })
      const outraMateria = await criarMateria({ nome: 'Outra Materia' })
      const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })

      const response = await app.request(
        `/api/matriculas/${matricula.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(cookie) },
          body: JSON.stringify({
            professorId: outroProfessor.id,
            materiaId: outraMateria.id,
            tipoAtendimento: 'PRE_ESCOLAR',
            estagio: 'Unidade 4',
            observacoes: 'Nota qualquer',
          }),
        },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as MatriculaOutputType
      expect(body.professorId).toBe(professor.id)
      expect(body.materiaId).toBe(materia.id)
      expect(body.tipoAtendimento).toBe('REGULAR')
      expect(body.estagio).toBeNull()
      expect(body.observacoes).toBe('Nota qualquer')
    })
  })
})
