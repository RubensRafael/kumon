import { beforeEach, describe, expect, it } from 'vitest'

import type { MatriculaOutputType } from '../../src/server/features/matriculas/matriculas.dto'
import type { ApiError } from '../../src/shared/dto'
import { authHeader, obterToken } from '../helpers/auth'
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

async function tokenAdmin() {
  const { usuario, senha } = await criarUsuarioAdmin()
  return obterToken(usuario.email, senha)
}

describe('matriculas', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/alunos/:alunoId/matriculas', () => {
    it('professor so ve as proprias matriculas do aluno', async () => {
      const materia = await criarMateria()
      const aluno = await criarAluno()
      const { usuario, professor, senha } = await criarUsuarioProfessor()
      const outroProfessor = await criarProfessor()

      const minha = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })
      const materia2 = await criarMateria()
      await criarMatricula({ alunoId: aluno.id, professorId: outroProfessor.id, materiaId: materia2.id })

      const token = await obterToken(usuario.email, senha)
      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        { headers: authHeader(token) },
        testEnv,
      )
      const body = (await response.json()) as MatriculaOutputType[]
      expect(body.map((m) => m.id)).toEqual([minha.id])
    })

    it('admin ve todas as matriculas do aluno', async () => {
      const materia1 = await criarMateria()
      const materia2 = await criarMateria()
      const aluno = await criarAluno()
      const professor1 = await criarProfessor()
      const professor2 = await criarProfessor()
      await criarMatricula({ alunoId: aluno.id, professorId: professor1.id, materiaId: materia1.id })
      await criarMatricula({ alunoId: aluno.id, professorId: professor2.id, materiaId: materia2.id })

      const token = await tokenAdmin()
      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        { headers: authHeader(token) },
        testEnv,
      )
      const body = (await response.json()) as MatriculaOutputType[]
      expect(body.length).toBe(2)
    })
  })

  describe('POST /api/alunos/:alunoId/matriculas', () => {
    it('cria matricula sem herdar horarios de nenhuma outra', async () => {
      const token = await tokenAdmin()
      const aluno = await criarAluno()
      const professor = await criarProfessor()
      const materia = await criarMateria()

      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ professorId: professor.id, materiaId: materia.id, tipoAtendimento: 'regular' }),
        },
        testEnv,
      )

      expect(response.status).toBe(201)
      const body = (await response.json()) as MatriculaOutputType
      expect(body.situacao).toBe('ativa')

      const horarios = await prisma.matriculaHorario.count({ where: { matriculaId: body.id } })
      expect(horarios).toBe(0)
    })

    it('rejeita segunda matricula ativa do mesmo aluno na mesma materia -> 400', async () => {
      const token = await tokenAdmin()
      const aluno = await criarAluno()
      const professor = await criarProfessor()
      const materia = await criarMateria()
      await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })

      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ professorId: professor.id, materiaId: materia.id, tipoAtendimento: 'regular' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('permite nova matricula ativa depois que a antiga foi encerrada (fluxo de troca)', async () => {
      const token = await tokenAdmin()
      const aluno = await criarAluno()
      const professorAntigo = await criarProfessor()
      const professorNovo = await criarProfessor()
      const materia = await criarMateria()
      const antiga = await criarMatricula({ alunoId: aluno.id, professorId: professorAntigo.id, materiaId: materia.id })

      const encerrar = await app.request(
        `/api/matriculas/${antiga.id}`,
        { method: 'PUT', headers: { ...jsonHeaders, ...authHeader(token) }, body: JSON.stringify({ situacao: 'encerrada' }) },
        testEnv,
      )
      expect(encerrar.status).toBe(200)

      const nova = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ professorId: professorNovo.id, materiaId: materia.id, tipoAtendimento: 'regular' }),
        },
        testEnv,
      )
      expect(nova.status).toBe(201)
    })

    it('rejeita materia inativa -> 400', async () => {
      const token = await tokenAdmin()
      const aluno = await criarAluno()
      const professor = await criarProfessor()
      const materia = await criarMateria({ ativo: false })

      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ professorId: professor.id, materiaId: materia.id, tipoAtendimento: 'regular' }),
        },
        testEnv,
      )
      expect(response.status).toBe(400)
    })

    it('professor autenticado nao pode criar matricula -> 403', async () => {
      const { usuario, senha } = await criarUsuarioProfessor()
      const token = await obterToken(usuario.email, senha)
      const aluno = await criarAluno()
      const professor = await criarProfessor()
      const materia = await criarMateria()

      const response = await app.request(
        `/api/alunos/${aluno.id}/matriculas`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ professorId: professor.id, materiaId: materia.id, tipoAtendimento: 'regular' }),
        },
        testEnv,
      )
      expect(response.status).toBe(403)
    })
  })

  describe('PUT /api/matriculas/:id', () => {
    it('atualiza estagio/situacao/observacoes normalmente', async () => {
      const token = await tokenAdmin()
      const aluno = await criarAluno()
      const professor = await criarProfessor()
      const materia = await criarMateria()
      const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })

      const response = await app.request(
        `/api/matriculas/${matricula.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ estagio: 'Unidade 3', situacao: 'pausada' }),
        },
        testEnv,
      )
      expect(response.status).toBe(200)
      const body = (await response.json()) as MatriculaOutputType
      expect(body.estagio).toBe('Unidade 3')
      expect(body.situacao).toBe('pausada')
    })

    it('professorId no corpo -> 422 com mensagem explicando o caminho certo', async () => {
      const token = await tokenAdmin()
      const aluno = await criarAluno()
      const professor = await criarProfessor()
      const outroProfessor = await criarProfessor()
      const materia = await criarMateria()
      const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })

      const response = await app.request(
        `/api/matriculas/${matricula.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ professorId: outroProfessor.id }),
        },
        testEnv,
      )
      expect(response.status).toBe(422)
      const body = (await response.json()) as ApiError
      expect(body.message).toContain('Encerre esta matricula')
    })

    it('materiaId no corpo -> 422', async () => {
      const token = await tokenAdmin()
      const aluno = await criarAluno()
      const professor = await criarProfessor()
      const materia = await criarMateria()
      const outraMateria = await criarMateria()
      const matricula = await criarMatricula({ alunoId: aluno.id, professorId: professor.id, materiaId: materia.id })

      const response = await app.request(
        `/api/matriculas/${matricula.id}`,
        {
          method: 'PUT',
          headers: { ...jsonHeaders, ...authHeader(token) },
          body: JSON.stringify({ materiaId: outraMateria.id }),
        },
        testEnv,
      )
      expect(response.status).toBe(422)
    })
  })
})
