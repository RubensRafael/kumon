import { HTTPException } from 'hono/http-exception'

import type { PrismaClient, SituacaoMatricula, TipoAtendimento } from '../../db/generated/client'
import type { MatriculaCreateInputType, MatriculaOutputType, MatriculaUpdateInputType } from './matriculas.dto'

interface MatriculaRow {
  id: string
  alunoId: string
  professorId: string
  materiaId: string
  estagio: string | null
  tipoAtendimento: TipoAtendimento
  situacao: SituacaoMatricula
  observacoes: string | null
}

function paraMatriculaOutput(matricula: MatriculaRow): MatriculaOutputType {
  return {
    id: matricula.id,
    alunoId: matricula.alunoId,
    professorId: matricula.professorId,
    materiaId: matricula.materiaId,
    estagio: matricula.estagio,
    tipoAtendimento: matricula.tipoAtendimento,
    situacao: matricula.situacao,
    observacoes: matricula.observacoes,
  }
}

export async function listarMatriculasDoAluno(
  prisma: PrismaClient,
  alunoId: string,
  escopoProfessorId: string | null,
): Promise<MatriculaOutputType[]> {
  const matriculas = await prisma.matricula.findMany({
    where: { alunoId, ...(escopoProfessorId ? { professorId: escopoProfessorId } : {}) },
    orderBy: { criadoEm: 'asc' },
  })
  return matriculas.map(paraMatriculaOutput)
}

export async function criarMatricula(
  prisma: PrismaClient,
  alunoId: string,
  input: MatriculaCreateInputType,
): Promise<MatriculaOutputType> {
  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId }, select: { id: true } })
  if (!aluno) {
    throw new HTTPException(404, { message: 'Aluno nao encontrado.' })
  }

  const professor = await prisma.professor.findUnique({
    where: { id: input.professorId },
    select: { id: true },
  })
  if (!professor) {
    throw new HTTPException(400, { message: 'professorId nao corresponde a nenhum professor existente.' })
  }

  const materia = await prisma.materia.findUnique({ where: { id: input.materiaId } })
  if (!materia) {
    throw new HTTPException(400, { message: 'materiaId nao corresponde a nenhuma materia existente.' })
  }
  if (!materia.ativo) {
    throw new HTTPException(400, { message: 'Nao e possivel matricular numa materia inativa.' })
  }

  const matriculaAtivaExistente = await prisma.matricula.findFirst({
    where: { alunoId, materiaId: input.materiaId, situacao: 'ATIVA' },
    select: { id: true },
  })
  if (matriculaAtivaExistente) {
    throw new HTTPException(400, {
      message: 'Ja existe uma matricula ativa deste aluno nesta materia.',
    })
  }

  const matricula = await prisma.matricula.create({
    data: {
      alunoId,
      professorId: input.professorId,
      materiaId: input.materiaId,
      estagio: input.estagio ?? null,
      tipoAtendimento: input.tipoAtendimento,
      observacoes: input.observacoes ?? null,
      // MATRICULA_HORARIO nao e copiado de nenhuma matricula anterior:
      // toda matricula nova nasce sem horario, mesmo numa troca de professor.
    },
  })
  return paraMatriculaOutput(matricula)
}

/** Admin-only — `professorId`/`materiaId` ja foram barrados a montante, por `rejeitarTrocaProfessorMateria`. */
export async function atualizarMatricula(
  prisma: PrismaClient,
  id: string,
  input: MatriculaUpdateInputType,
): Promise<MatriculaOutputType> {
  const existente = await prisma.matricula.findUnique({ where: { id } })
  if (!existente) {
    throw new HTTPException(404, { message: 'Matricula nao encontrada.' })
  }

  const matricula = await prisma.matricula.update({
    where: { id },
    data: {
      ...(input.estagio !== undefined ? { estagio: input.estagio } : {}),
      ...(input.tipoAtendimento !== undefined ? { tipoAtendimento: input.tipoAtendimento } : {}),
      ...(input.situacao !== undefined ? { situacao: input.situacao } : {}),
      ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
    },
  })
  return paraMatriculaOutput(matricula)
}
