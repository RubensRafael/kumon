import type { DiaSemana as DiaSemanaApi } from '../../../shared/dto/enums'
import { paraApi } from '../../lib/db-enum'
import type { PrismaClient } from '../../db/generated/client'
import type { PainelOutputType } from './painel.dto'

const DIAS_BANCO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

function minutosDoHorario(hhmm: string): number {
  const [horas, minutos] = hhmm.split(':').map(Number)
  return (horas ?? 0) * 60 + (minutos ?? 0)
}

/**
 * Quantidade de vagas-horario que um professor abre por semana:
 * dias disponiveis x quantos slots de `duracaoAulaMin` cabem entre
 * `horarioInicial` e `horarioFinal` x `capacidadePorHorario` (vagas por
 * slot). E a base de `ocupacaoPercentual` — ver docs/pr-10-painel.md,
 * "Decisoes tomadas": a spec nao define essa formula, esta e uma
 * aproximacao razoavel a partir dos campos que o schema realmente tem.
 */
function capacidadeSemanal(professor: {
  diasDisponiveis: string[]
  horarioInicial: string
  horarioFinal: string
  duracaoAulaMin: number
  capacidadePorHorario: number
}): number {
  if (professor.duracaoAulaMin <= 0) return 0

  const inicio = minutosDoHorario(professor.horarioInicial)
  const fim = minutosDoHorario(professor.horarioFinal)
  const slotsPorDia = Math.max(0, Math.floor((fim - inicio) / professor.duracaoAulaMin))

  return professor.diasDisponiveis.length * slotsPorDia * professor.capacidadePorHorario
}

export async function obterPainel(
  prisma: PrismaClient,
  escopoProfessorId: string | null,
): Promise<PainelOutputType> {
  const filtroAlunoAtivoEscopado = {
    situacao: 'ATIVO' as const,
    ...(escopoProfessorId
      ? { matriculas: { some: { professorId: escopoProfessorId, situacao: 'ATIVA' as const } } }
      : {}),
  }
  const filtroMatriculaAtivaEscopada = {
    situacao: 'ATIVA' as const,
    ...(escopoProfessorId ? { professorId: escopoProfessorId } : {}),
  }
  const filtroHorarioAtivoEscopado = {
    ativo: true,
    ...(escopoProfessorId ? { matricula: { professorId: escopoProfessorId } } : {}),
  }

  const [
    totalAlunosAtivos,
    totalMatriculasAtivas,
    // Sempre da unidade inteira, mesmo escopado — mesma logica de
    // GET /professores (PR 03), que ja e um diretorio nao-escopado.
    totalProfessores,
    professoresParaCapacidade,
    matriculasAgrupadas,
    horariosAgrupados,
    alunosZonaVermelha,
  ] = await Promise.all([
    prisma.aluno.count({ where: filtroAlunoAtivoEscopado }),
    prisma.matricula.count({ where: filtroMatriculaAtivaEscopada }),
    prisma.professor.count(),
    prisma.professor.findMany({
      where: escopoProfessorId ? { id: escopoProfessorId } : undefined,
      select: {
        diasDisponiveis: true,
        horarioInicial: true,
        horarioFinal: true,
        duracaoAulaMin: true,
        capacidadePorHorario: true,
      },
    }),
    prisma.matricula.groupBy({
      by: ['materiaId'],
      where: filtroMatriculaAtivaEscopada,
      _count: { _all: true },
    }),
    prisma.matriculaHorario.groupBy({
      by: ['diaSemana'],
      where: filtroHorarioAtivoEscopado,
      _count: { _all: true },
    }),
    prisma.aluno.findMany({
      where: {
        situacao: 'ATIVO',
        zonaVermelha: true,
        ...(escopoProfessorId
          ? { matriculas: { some: { professorId: escopoProfessorId, situacao: 'ATIVA' } } }
          : {}),
      },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  const capacidadeTeorica = professoresParaCapacidade.reduce(
    (soma, professor) => soma + capacidadeSemanal(professor),
    0,
  )
  const totalHorariosAtivos = horariosAgrupados.reduce((soma, grupo) => soma + grupo._count._all, 0)
  const ocupacaoPercentual =
    capacidadeTeorica > 0 ? Math.round((totalHorariosAtivos / capacidadeTeorica) * 1000) / 10 : 0

  const materiaIds = matriculasAgrupadas.map((grupo) => grupo.materiaId)
  const materias = await prisma.materia.findMany({
    where: { id: { in: materiaIds } },
    select: { id: true, nome: true },
  })
  const nomeDaMateria = new Map(materias.map((materia) => [materia.id, materia.nome]))

  const matriculasPorMateria = matriculasAgrupadas.map((grupo) => ({
    materiaId: grupo.materiaId,
    materiaNome: nomeDaMateria.get(grupo.materiaId) ?? '',
    total: grupo._count._all,
  }))

  // Todos os 7 dias sempre presentes (mesmo com total 0) — mais util pra um
  // grafico de barras do que omitir dias sem aula.
  const totalPorDia = new Map(horariosAgrupados.map((grupo) => [grupo.diaSemana, grupo._count._all]))
  const aulasPorDiaSemana = DIAS_BANCO.map((dia) => ({
    diaSemana: paraApi<DiaSemanaApi>(dia),
    total: totalPorDia.get(dia) ?? 0,
  }))

  // Unico tipo de alerta implementado: a spec nao define nenhuma regra de
  // alerta, mas `Aluno.zonaVermelha` existe no schema sem nenhum outro uso
  // em toda a spec alem de aparecer em `AlunoOutput` — a conexao mais obvia.
  const alertas = alunosZonaVermelha.map((aluno) => ({
    tipo: 'zona_vermelha',
    alunoId: aluno.id,
    mensagem: `${aluno.nome} esta marcado como zona vermelha.`,
  }))

  return {
    totalAlunosAtivos,
    totalMatriculasAtivas,
    totalProfessores,
    ocupacaoPercentual,
    matriculasPorMateria,
    aulasPorDiaSemana,
    alertas,
  }
}
