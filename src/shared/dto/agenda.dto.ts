import { z } from 'zod'

import { DiaSemanaEnum, HorarioDoDia } from './enums'
import type { PainelDadosOutputType } from './painel.dto'

export const AgendaSlotOutput = z.object({
  horarioId: z.uuid(),
  diaSemana: DiaSemanaEnum,
  horario: HorarioDoDia,
  matriculaId: z.uuid(),
  alunoId: z.uuid(),
  alunoNome: z.string(),
  professorId: z.uuid(),
  professorNome: z.string(),
  materiaId: z.uuid(),
})
export type AgendaSlotOutputType = z.infer<typeof AgendaSlotOutput>

const ORDEM_DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

/**
 * Substitui o antigo `GET /agenda`/`GET /alunos/:id/agenda` (PR 09,
 * retirado) -- a agenda e so uma outra forma de olhar pro mesmo snapshot que
 * `GET /painel` ja devolve, entao virou uma funcao pura em vez de um
 * endpoint proprio. `professorId`/`alunoId` sao filtros opcionais aplicados
 * aqui, nao mais na query do backend.
 */
export function derivarAgendaSlots(
  dados: PainelDadosOutputType,
  filtro: { professorId?: string; alunoId?: string } = {},
): AgendaSlotOutputType[] {
  const nomeDoAluno = new Map(dados.alunos.map((aluno) => [aluno.id, aluno.nome]))
  const nomeDoProfessor = new Map(dados.professores.map((professor) => [professor.id, professor.nome]))

  const matriculas = dados.matriculas.filter(
    (matricula) =>
      (!filtro.professorId || matricula.professorId === filtro.professorId) &&
      (!filtro.alunoId || matricula.alunoId === filtro.alunoId),
  )

  return matriculas
    .flatMap((matricula) =>
      matricula.horarios.map((horario) => ({
        horarioId: horario.id,
        diaSemana: horario.diaSemana,
        horario: horario.horario,
        matriculaId: matricula.id,
        alunoId: matricula.alunoId,
        alunoNome: nomeDoAluno.get(matricula.alunoId) ?? '',
        professorId: matricula.professorId,
        professorNome: nomeDoProfessor.get(matricula.professorId) ?? '',
        materiaId: matricula.materiaId,
      })),
    )
    .sort(
      (a, b) =>
        ORDEM_DIAS.indexOf(a.diaSemana) - ORDEM_DIAS.indexOf(b.diaSemana) || a.horario.localeCompare(b.horario),
    )
}
