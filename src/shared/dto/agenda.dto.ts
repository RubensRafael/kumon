import { z } from 'zod'

import { DiaSemanaEnum, HorarioDoDia, TipoAtendimentoEnum } from './enums'
import { horariosOcupados } from './ocupacao'
import type { PainelDadosOutputType } from './painel.dto'

export const AgendaSlotOutput = z.object({
  horarioId: z.uuid(),
  diaSemana: DiaSemanaEnum,
  horario: HorarioDoDia,
  matriculaId: z.uuid(),
  alunoId: z.uuid(),
  alunoNome: z.string(),
  alunoConnect: z.boolean(),
  alunoZonaVermelha: z.boolean(),
  professorId: z.uuid(),
  professorNome: z.string(),
  professorCorAgenda: z.string(),
  materiaId: z.uuid(),
  estagio: z.string().nullable(),
  tipoAtendimento: TipoAtendimentoEnum,
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
  const alunoPorId = new Map(dados.alunos.map((aluno) => [aluno.id, aluno]))
  const professorPorId = new Map(dados.professores.map((professor) => [professor.id, professor]))

  const matriculas = dados.matriculas.filter(
    (matricula) =>
      (!filtro.professorId || matricula.professorId === filtro.professorId) &&
      (!filtro.alunoId || matricula.alunoId === filtro.alunoId),
  )

  return matriculas
    .flatMap((matricula) => {
      const aluno = alunoPorId.get(matricula.alunoId)
      const professor = professorPorId.get(matricula.professorId)

      return matricula.horarios.map((horario) => ({
        horarioId: horario.id,
        diaSemana: horario.diaSemana,
        horario: horario.horario,
        matriculaId: matricula.id,
        alunoId: matricula.alunoId,
        alunoNome: aluno?.nome ?? '',
        alunoConnect: aluno?.connect ?? false,
        alunoZonaVermelha: aluno?.zonaVermelha ?? false,
        professorId: matricula.professorId,
        professorNome: professor?.nome ?? '',
        professorCorAgenda: professor?.corAgenda ?? '#64748b',
        materiaId: matricula.materiaId,
        estagio: matricula.estagio,
        tipoAtendimento: matricula.tipoAtendimento,
      }))
    })
    .sort(
      (a, b) =>
        ORDEM_DIAS.indexOf(a.diaSemana) - ORDEM_DIAS.indexOf(b.diaSemana) || a.horario.localeCompare(b.horario),
    )
}

export interface OcupacaoCelula {
  /** Slots que realmente comecam nesse horario -- as pills que a celula renderiza. */
  ocupantes: AgendaSlotOutputType[]
  /**
   * Slots de um horario anterior cuja aula (por `tipoAtendimento`, ver
   * `horariosOcupados`) ainda "vaza" pra esse horario -- ex.: um `REGULAR`
   * as 14:00 aparece aqui na celula de 14:30. Nao vira pill propria, so
   * conta pra ocupacao/cor da celula.
   */
  overflow: AgendaSlotOutputType[]
  /** `capacidadePorHorario` do professor da celula, ou 0 se o professor nao existir mais. */
  capacidade: number
}

/**
 * Ocupacao de uma celula (professor x dia x horario) da Agenda, considerando
 * o spillover de aulas `REGULAR` do horario anterior -- mesma regra de
 * duracao que `calcularAgregacoesPainel` usa pro percentual agregado
 * (`horariosOcupados`), so que aqui resolvida por celula em vez de somada
 * pra unidade inteira.
 */
export function calcularOcupacaoCelula(
  dados: PainelDadosOutputType,
  { professorId, diaSemana, horario }: { professorId: string; diaSemana: string; horario: string },
): OcupacaoCelula {
  const professor = dados.professores.find((p) => p.id === professorId)
  const slotsDoProfessorNoDia = derivarAgendaSlots(dados, { professorId }).filter(
    (slot) => slot.diaSemana === diaSemana,
  )

  const ocupantes = slotsDoProfessorNoDia.filter((slot) => slot.horario === horario)
  const overflow = slotsDoProfessorNoDia.filter(
    (slot) => slot.horario !== horario && horariosOcupados(slot.horario, slot.tipoAtendimento).includes(horario),
  )

  return { ocupantes, overflow, capacidade: professor?.capacidadePorHorario ?? 0 }
}
