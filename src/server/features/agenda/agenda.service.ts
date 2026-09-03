import type { DiaSemana as DiaSemanaApi } from '../../../shared/dto/enums'
import { paraApi } from '../../lib/db-enum'
import type { Prisma, PrismaClient } from '../../db/generated/client'
import type { AgendaSlotOutputType } from './agenda.dto'

const INCLUDE = {
  matricula: {
    include: {
      aluno: { select: { id: true, nome: true } },
      professor: { select: { id: true, nome: true } },
    },
  },
} satisfies Prisma.MatriculaHorarioInclude

type HorarioComMatricula = Prisma.MatriculaHorarioGetPayload<{ include: typeof INCLUDE }>

function paraAgendaSlotOutput(horario: HorarioComMatricula): AgendaSlotOutputType {
  return {
    horarioId: horario.id,
    diaSemana: paraApi<DiaSemanaApi>(horario.diaSemana),
    horario: horario.horario,
    matriculaId: horario.matriculaId,
    alunoId: horario.matricula.alunoId,
    alunoNome: horario.matricula.aluno.nome,
    professorId: horario.matricula.professorId,
    professorNome: horario.matricula.professor.nome,
    materiaId: horario.matricula.materiaId,
  }
}

/**
 * `escopoProfessorId` sempre vence a querystring quando `papel === 'professor'`
 * — o `professorId` da query e literalmente ignorado nesse caso (ver spec,
 * secao 8). Pra `admin` sem `professorId` na query, sem filtro: agenda da
 * unidade inteira.
 */
export async function listarAgenda(
  prisma: PrismaClient,
  professorIdQuery: string | undefined,
  escopoProfessorId: string | null,
): Promise<AgendaSlotOutputType[]> {
  const professorId = escopoProfessorId ?? professorIdQuery

  const horarios = await prisma.matriculaHorario.findMany({
    where: { ativo: true, ...(professorId ? { matricula: { professorId } } : {}) },
    include: INCLUDE,
    orderBy: [{ diaSemana: 'asc' }, { horario: 'asc' }],
  })
  return horarios.map(paraAgendaSlotOutput)
}

/**
 * Igual `GET /alunos`: rota em formato de lista, escopo por filtragem — um
 * aluno inexistente, ou que nao pertence ao professor, simplesmente devolve
 * `[]`, nunca `404`.
 */
export async function listarAgendaDoAluno(
  prisma: PrismaClient,
  alunoId: string,
  escopoProfessorId: string | null,
): Promise<AgendaSlotOutputType[]> {
  const horarios = await prisma.matriculaHorario.findMany({
    where: {
      ativo: true,
      matricula: { alunoId, ...(escopoProfessorId ? { professorId: escopoProfessorId } : {}) },
    },
    include: INCLUDE,
    orderBy: [{ diaSemana: 'asc' }, { horario: 'asc' }],
  })
  return horarios.map(paraAgendaSlotOutput)
}
