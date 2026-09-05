import type { PrismaClient } from '../../db/generated/client'
import type { PainelDadosOutputType } from '../../../shared/dto/painel.dto'

/**
 * Sem escopo por professor na query -- e leitura pura (visualizacao), e
 * qualquer usuario autenticado pode ver o snapshot inteiro da unidade.
 * Agregacoes (`calcularAgregacoesPainel`) e a visao de agenda
 * (`derivarAgendaSlots`), ambas em `shared/dto/`, sao quem decide o que
 * filtrar por professor -- sempre no client, sobre este mesmo payload.
 * `horarios` de cada matricula so traz `ativo: true` -- nem agenda nem
 * ocupacao precisam de horario inativo.
 */
export async function obterDadosPainel(prisma: PrismaClient): Promise<PainelDadosOutputType> {
  const [professores, alunos, materias, matriculas] = await Promise.all([
    prisma.professor.findMany({
      select: {
        id: true,
        nome: true,
        diasDisponiveis: true,
        horarioInicial: true,
        horarioFinal: true,
        capacidadePorHorario: true,
        materias: { select: { materiaId: true } },
        corAgenda: true,
      },
    }),
    prisma.aluno.findMany({
      select: { id: true, nome: true, situacao: true, zonaVermelha: true, connect: true },
    }),
    prisma.materia.findMany({
      select: {
        id: true,
        nome: true,
        conteudos: { select: { id: true, nome: true, ativo: true } },
      },
    }),
    prisma.matricula.findMany({
      select: {
        id: true,
        alunoId: true,
        professorId: true,
        materiaId: true,
        estagio: true,
        situacao: true,
        tipoAtendimento: true,
        horarios: {
          where: { ativo: true },
          select: { id: true, diaSemana: true, horario: true },
        },
      },
    }),
  ])

  return {
    professores: professores.map((professor) => ({
      ...professor,
      materiaIds: professor.materias.map((m) => m.materiaId),
    })),
    alunos,
    materias,
    matriculas,
  }
}
